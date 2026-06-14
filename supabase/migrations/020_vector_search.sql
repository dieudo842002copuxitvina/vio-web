-- ── 020_vector_search.sql ─────────────────────────────────────────────────────
-- Week 2.5 (Vector/Semantic parts): Embedding Infrastructure + Semantic Search.
--
-- Earlier Week 2.5 items (impressions, clicks, quality scores, cold-start,
-- anti-spam, trust scores) were already implemented in migrations 010, 011, 016,
-- and 019.  This migration adds the remaining vector-specific components:
--
-- Tables:
--   • listing_embeddings   — per-listing semantic embedding + metadata fingerprint
--   • user_embeddings      — per-user interest embedding (from engagement history)
--
-- Indexes:
--   • HNSW cosine indexes on both embedding tables (1M+ scale, low memory)
--
-- Functions:
--   • search_listings_semantic(query_embedding, filters, limit, cursor)
--       Hybrid retrieval: ANN vector search → merged with FTS score → reranked
--       Returns identical column set to search_listings_hybrid() for drop-in use.
--
-- Extension:
--   • pgvector (CREATE EXTENSION IF NOT EXISTS vector)
--
-- Embedding dimensions: 384
--   Compatible with multilingual-e5-small, paraphrase-multilingual-MiniLM-L12-v2.
--   At 1M listings: 384 × 4 bytes × 1M ≈ 1.5 GB HNSW index (fits in 16 GB RAM).
--
-- Update pipeline (ASYNC — NOT synchronous):
--   Embeddings are computed by an external worker (Next.js Edge Function or
--   Python worker) and written via INSERT / ON CONFLICT DO UPDATE.
--   The HNSW index auto-updates on insert; no REINDEX needed for < 10% churn.
--
-- Depends on: migrations 001–019
-- Safe to re-run: all DDL uses IF NOT EXISTS / OR REPLACE.

-- ══════════════════════════════════════════════════════════════════════════════
-- 0.  pgvector extension
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  listing_embeddings
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per listing, populated asynchronously by the embedding worker.
-- content_fingerprint is a 16-char truncated MD5 of (title + description) —
-- used to detect when content has changed so the worker can re-embed stale rows.
--
-- model_version lets us filter for rows embedded with an outdated model when
-- doing a rolling re-embedding campaign.
--
-- embedding_source tracks what text was encoded (title-only for new listings
-- before description is set; full content after).

CREATE TABLE IF NOT EXISTS public.listing_embeddings (
  listing_id         uuid         PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  embedding          vector(384)  NOT NULL,
  content_fingerprint text        NOT NULL DEFAULT '',  -- MD5[:16] of title+desc
  model_version      text         NOT NULL DEFAULT 'mE5-small-v1',
  embedding_source   text         NOT NULL DEFAULT 'title+description'
                       CHECK (embedding_source IN (
                         'title',
                         'title+description',
                         'title+description+attributes'
                       )),
  embedded_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

-- ── HNSW cosine index ─────────────────────────────────────────────────────────
--
-- HNSW outperforms IVFFlat for incremental inserts and point-query recall.
-- m=16 is the standard for marketplace-scale (1M rows, 384 dims).
-- ef_construction=64 is a balance: higher = better recall, slower build.
--
-- Cosine distance (<=>) is correct for sentence embeddings.
-- Inner product (<#>) would require unit-normalized vectors — don't assume that.

CREATE INDEX IF NOT EXISTS listing_embeddings_hnsw_idx
  ON public.listing_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Staleness feed: find rows with outdated fingerprint or old model (for worker)
CREATE INDEX IF NOT EXISTS listing_embeddings_stale_idx
  ON public.listing_embeddings (embedded_at ASC)
  WHERE model_version <> 'mE5-small-v1';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  user_embeddings
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per-user interest embedding derived from their engagement history.
-- Not a direct textual embedding — it is a weighted average of the listing
-- embeddings the user interacted with (impression-weighting: inquiry=5,
-- save=3, click=2, view=1).
--
-- session_id support: anonymous users get session-scoped embeddings.
-- When a session authenticates, the session embedding is merged into
-- the profile embedding (handled by the async worker).
--
-- last_interaction_at tracks recency for the rolling refresh strategy.
-- Embeddings older than 14 days without new interactions are pruned.

CREATE TABLE IF NOT EXISTS public.user_embeddings (
  user_id              text         NOT NULL,  -- uuid (profile) or session_id (anon)
  user_type            text         NOT NULL DEFAULT 'profile'
                         CHECK (user_type IN ('profile', 'session')),
  embedding            vector(384)  NOT NULL,
  interaction_count    integer      NOT NULL DEFAULT 0,
  model_version        text         NOT NULL DEFAULT 'mE5-small-v1',
  last_interaction_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, user_type)
);

-- HNSW index for user-to-listing similarity (recommendation queries)
CREATE INDEX IF NOT EXISTS user_embeddings_hnsw_idx
  ON public.user_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Prune feed: stale anonymous embeddings (old sessions)
CREATE INDEX IF NOT EXISTS user_embeddings_stale_idx
  ON public.user_embeddings (last_interaction_at ASC)
  WHERE user_type = 'session';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  search_listings_semantic()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Hybrid semantic search: ANN vector retrieval → trust/quality rerank.
--
-- Strategy:
--   1. ANN retrieval: find top-K candidates by embedding cosine similarity.
--      K = p_limit × 5 (candidate multiplier) to allow reranking headroom.
--   2. Metadata filter: apply type/province/district/category/price filters.
--      (These are applied AFTER ANN retrieval to avoid degrading recall.
--       At 1M listings, pre-filtering by province + category reduces the
--       search space enough for the HNSW index to remain efficient.)
--   3. Rerank: combine cosine_similarity with trust/quality/freshness boosts.
--      The text relevance component is dropped (semantic already captures it).
--   4. Cursor pagination: keyed on (rank_score DESC, updated_at DESC, id DESC).
--
-- Rerank formula:
--   base_score    = (1 - cosine_distance) × 0.70           -- semantic similarity
--   quality_boost = COALESCE(qs.quality_score × 0.30, 0)   -- engagement quality
--   trust_boost   = trust CASE (max +0.05)                  -- same as hybrid
--   spam_penalty  = COALESCE(qs.spam_penalty × 0.40, 0)     -- same as hybrid
--   ctr_boost     = CTR boost (max +0.40)                   -- same as hybrid
--   cold_start    = cold-start floor (max +0.25)            -- same as hybrid
--   final_score   = base_score + quality_boost + trust_boost + ctr_boost
--                   + cold_start − spam_penalty
--
-- SECURITY DEFINER required because:
--   • Must join listing_quality_scores (backed by listing_events with no public SELECT)
--   • merchant_trust_scores is readable but keeping DEFINER matches hybrid func contract
--
-- Cursor pagination: p_cursor_score + p_cursor_updated_at + p_cursor_id
-- (same cursor format as search_listings_hybrid — compatible with shared pagination UI)

CREATE OR REPLACE FUNCTION search_listings_semantic(
  query_embedding      vector(384),
  p_type               text        DEFAULT NULL,
  p_province_id        integer     DEFAULT NULL,
  p_district_id        integer     DEFAULT NULL,
  p_category_id        integer     DEFAULT NULL,
  p_price_min          numeric     DEFAULT NULL,
  p_price_max          numeric     DEFAULT NULL,
  p_limit              integer     DEFAULT 20,
  p_cursor_score       float4      DEFAULT NULL,
  p_cursor_updated_at  timestamptz DEFAULT NULL,
  p_cursor_id          uuid        DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  type              text,
  slug              text,
  title             text,
  short_description text,
  cover_url         text,
  location_text     text,
  price_text        text,
  price_amount      numeric,
  is_featured       boolean,
  is_verified       boolean,
  province_id       integer,
  district_id       integer,
  category_id       integer,
  contact_phone     text,
  updated_at        timestamptz,
  rank_score        float4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
-- Candidate multiplier: fetch 5× the desired limit to allow reranking headroom.
-- At p_limit=20 → 100 ANN candidates; at p_limit=100 → 500 candidates.
-- HNSW ef_search defaults to 40; for K=100 candidates this is within recall budget.
DECLARE
  k_candidates integer := GREATEST(100, p_limit * 5);
BEGIN
  RETURN QUERY
  WITH ann_candidates AS (
    -- ANN retrieval: nearest neighbours by cosine distance.
    -- The ORDER BY <=> operator triggers the HNSW index scan.
    -- No metadata filters here — filtering AFTER ANN preserves recall.
    -- Cosine distance range: 0 (identical) to 2 (opposite).
    SELECT
      le.listing_id,
      1.0 - (le.embedding <=> query_embedding)  AS cosine_similarity
    FROM public.listing_embeddings le
    ORDER BY le.embedding <=> query_embedding
    LIMIT k_candidates
  ),
  reranked AS (
    SELECT
      l.id,
      l.type,
      l.slug,
      l.title,
      l.short_description,
      l.cover_url,
      l.location_text,
      l.price_text,
      l.price_amount,
      l.is_featured,
      l.is_verified,
      l.province_id,
      l.district_id,
      l.category_id,
      l.contact_phone,
      l.updated_at,
      (
        -- ── Semantic similarity (dominant at 70%) ──────────────────────────
        GREATEST(0.0, ac.cosine_similarity) * 0.70

        -- ── Static boosts ─────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context ───────────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness ─────────────────────────────────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (max +0.40) ──────────────────────────────────────────
        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        -- ── Quality boost (max +0.30) ──────────────────────────────────────
        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

        -- ── Cold-start floor (max +0.25) ───────────────────────────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END

        -- ── Trust boost (max +0.05) ────────────────────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                    AND COALESCE(mts.identity_verified, false)
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Spam penalty (max −0.40) ───────────────────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40
      )::float4 AS _rank

    FROM ann_candidates ac
    JOIN public.listings l ON l.id = ac.listing_id

    LEFT JOIN public.listing_ctr_stats       cs  ON cs.listing_id  = l.id
    LEFT JOIN public.listing_quality_scores  qs  ON qs.listing_id  = l.id
    LEFT JOIN public.merchant_trust_scores   mts ON mts.profile_id = l.owner_id

    WHERE
      l.is_public          = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_district_id IS NULL OR l.district_id = p_district_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
  )
  SELECT
    r.id,
    r.type::text,
    r.slug,
    r.title,
    r.short_description,
    r.cover_url,
    r.location_text,
    r.price_text,
    r.price_amount,
    r.is_featured,
    r.is_verified,
    r.province_id,
    r.district_id,
    r.category_id,
    r.contact_phone,
    r.updated_at,
    r._rank
  FROM reranked r
  WHERE (
    p_cursor_score IS NULL
    OR r._rank < p_cursor_score
    OR (r._rank = p_cursor_score AND r.updated_at < p_cursor_updated_at)
    OR (r._rank = p_cursor_score AND r.updated_at = p_cursor_updated_at
        AND r.id < p_cursor_id)
  )
  ORDER BY r._rank DESC, r.updated_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_listings_semantic TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  Row-level security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listing_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_embeddings    ENABLE ROW LEVEL SECURITY;

-- listing_embeddings: public read (non-sensitive — just vectors)
DROP POLICY IF EXISTS "listing_embeddings_public_read" ON public.listing_embeddings;
CREATE POLICY "listing_embeddings_public_read" ON public.listing_embeddings
  FOR SELECT TO anon, authenticated USING (true);

-- listing_embeddings: only the embedding worker (service role) can write
-- (anon + authenticated roles cannot INSERT/UPDATE/DELETE)

-- user_embeddings: users read own embedding only
DROP POLICY IF EXISTS "user_embeddings_owner_read"   ON public.user_embeddings;
CREATE POLICY "user_embeddings_owner_read" ON public.user_embeddings
  FOR SELECT TO authenticated
  USING (user_type = 'profile' AND user_id = auth.uid()::text);

-- Session embeddings: no read policy for anon (they don't self-read embeddings)
-- Worker uses service role key to read/write all session embeddings.

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  Embedding staleness helper view
-- ══════════════════════════════════════════════════════════════════════════════
--
-- The embedding worker queries this view to find listings that need
-- (re)embedding.  Two cases:
--   a) listing has no embedding yet
--   b) content has changed since last embed (fingerprint mismatch)
--
-- Worker flow:
--   1. SELECT listing_id, title, description FROM stale_listing_embeddings LIMIT 100
--   2. Send to embedding API in batch
--   3. INSERT INTO listing_embeddings ... ON CONFLICT DO UPDATE
--
-- Partitioning note: at 1M+ listings, consider a WHERE l.status = 'published'
-- partial index on listings to bound the view scan.

CREATE OR REPLACE VIEW public.stale_listing_embeddings AS
SELECT
  l.id                                                                  AS listing_id,
  l.title,
  COALESCE(l.description, '')                                           AS description,
  l.updated_at,
  le.embedded_at,
  le.content_fingerprint,
  -- MD5 of current content (truncated for comparison)
  LEFT(md5(l.title || COALESCE(l.description, '')), 16)                AS current_fingerprint,
  CASE
    WHEN le.listing_id IS NULL THEN 'new'
    WHEN LEFT(md5(l.title || COALESCE(l.description, '')), 16) <>
         le.content_fingerprint                                         THEN 'content_changed'
    WHEN le.model_version <> 'mE5-small-v1'                            THEN 'model_outdated'
    ELSE 'up_to_date'
  END                                                                   AS embed_status
FROM public.listings l
LEFT JOIN public.listing_embeddings le ON le.listing_id = l.id
WHERE l.status           = 'published'
  AND l.is_public         = true
  AND l.moderation_status = 'approved'
  AND (
    le.listing_id IS NULL
    OR LEFT(md5(l.title || COALESCE(l.description, '')), 16) <> le.content_fingerprint
    OR le.model_version <> 'mE5-small-v1'
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  AI reranking preparation — candidate export function
-- ══════════════════════════════════════════════════════════════════════════════
--
-- When an AI reranking layer is added, it will:
--   1. Receive top-K candidates from search_listings_semantic() (or hybrid)
--   2. Send to reranker (cross-encoder or LLM-based)
--   3. Return reranked IDs
--   4. Fetch full listing rows by ID (single indexed lookup)
--
-- This function generates the candidate payload the reranker will receive.
-- It intentionally returns lightweight rows (no embedding vectors) to
-- minimise latency on the candidate-generation leg.
--
-- Recommended latency budget:
--   Stage 1 (ANN retrieval, K=100):    < 5 ms  (HNSW, warm cache)
--   Stage 2 (metadata join + rerank):  < 10 ms (indexed joins)
--   Stage 3 (AI reranker, K=20→K=100): < 150 ms (external, async or Edge cache)
--   Total P99:                         < 200 ms

CREATE OR REPLACE FUNCTION search_listings_candidates(
  query_embedding      vector(384),
  p_type               text        DEFAULT NULL,
  p_province_id        integer     DEFAULT NULL,
  p_category_id        integer     DEFAULT NULL,
  p_limit              integer     DEFAULT 100  -- larger K for reranker
)
RETURNS TABLE (
  id             uuid,
  title          text,
  short_description text,
  price_amount   numeric,
  province_id    integer,
  category_id    integer,
  trust_score    numeric,
  quality_score  numeric,
  cosine_sim     float4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.short_description,
    l.price_amount,
    l.province_id,
    l.category_id,
    COALESCE(mts.trust_score, 0)::numeric  AS trust_score,
    COALESCE(qs.quality_score, 0)::numeric AS quality_score,
    (1.0 - (le.embedding <=> query_embedding))::float4 AS cosine_sim
  FROM public.listing_embeddings le
  JOIN public.listings l ON l.id = le.listing_id
  LEFT JOIN public.merchant_trust_scores   mts ON mts.profile_id = l.owner_id
  LEFT JOIN public.listing_quality_scores  qs  ON qs.listing_id  = l.id
  WHERE
    l.is_public          = true
    AND l.moderation_status = 'approved'
    AND l.status            = 'published'
    AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
    AND (p_type       IS NULL OR l.type::text  = p_type)
    AND (p_province_id IS NULL OR l.province_id = p_province_id)
    AND (p_category_id IS NULL OR l.category_id = p_category_id)
  ORDER BY le.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_listings_candidates TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- END 020_vector_search.sql
-- ══════════════════════════════════════════════════════════════════════════════
