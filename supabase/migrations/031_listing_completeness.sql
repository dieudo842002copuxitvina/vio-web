-- 031_listing_completeness.sql
-- Persisted completeness scoring for land listings.
-- Scores are computed server-side by calling compute_listing_completeness(listing_id)
-- from the application layer (NOT via triggers, to avoid recursive locking).
--
-- Score breakdown (total: 100 points):
--   photo_score   0–20   5+ images=20, 3-4=16, 2=12, 1=6, 0=0
--   gps_score     0–10   lat+lng present=10
--   legal_score   0–15   sổ đỏ/hồng=15, giấy tay=7, pending=3, none=0
--   seller_score  0–10   verified=10, profile exists=3
--   infra_score   0–15   row exists=5, road_access filled=+5, water_source filled=+5
--   agri_score    0–20   row exists=5, soil_type=+5, current_crops=+5, certifications=+5
--   text_score    0–5    ≥300 chars=5, ≥80=3, >0=1
--   video_score   0–5    at least 1 video in listing_media=5
--
-- Tiers:
--   platinum 90–100
--   gold     75–89
--   silver   55–74
--   bronze   0–54

-- ─────────────────────────────────────────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_completeness (
  listing_id   uuid      PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,

  -- Composite score
  total_score  smallint  NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),

  -- Sub-scores (stored for dashboard breakdown)
  photo_score  smallint  NOT NULL DEFAULT 0,
  gps_score    smallint  NOT NULL DEFAULT 0,
  legal_score  smallint  NOT NULL DEFAULT 0,
  seller_score smallint  NOT NULL DEFAULT 0,
  infra_score  smallint  NOT NULL DEFAULT 0,
  agri_score   smallint  NOT NULL DEFAULT 0,
  text_score   smallint  NOT NULL DEFAULT 0,
  video_score  smallint  NOT NULL DEFAULT 0,

  -- Human-readable tier (used for badge display + search boost)
  tier         text      NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),

  -- Quick-filter flags (denormalized from sub-scores for index efficiency)
  has_gps         boolean NOT NULL DEFAULT false,
  has_infra       boolean NOT NULL DEFAULT false,
  has_agriculture boolean NOT NULL DEFAULT false,
  has_video       boolean NOT NULL DEFAULT false,

  computed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_completeness_score
  ON listing_completeness(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_completeness_tier
  ON listing_completeness(tier);

-- Allows search ranking boost: filter out bronze listings in premium placement
CREATE INDEX IF NOT EXISTS idx_completeness_tier_score
  ON listing_completeness(tier, total_score DESC);

ALTER TABLE listing_completeness ENABLE ROW LEVEL SECURITY;

-- Public can read completeness (shown on listing detail)
CREATE POLICY "completeness_public_read"
  ON listing_completeness FOR SELECT USING (true);

-- Only service role can write (application calls SECURITY DEFINER function)
CREATE POLICY "completeness_service_write"
  ON listing_completeness FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: compute_listing_completeness(p_listing_id)
-- Call from application after: listing publish, media upload/delete,
-- infrastructure upsert, agriculture upsert, legal upsert, seller verification.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_listing_completeness(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Row fetches
  v_listing             listings%ROWTYPE;
  v_infra               listing_infrastructure%ROWTYPE;
  v_agri                listing_agriculture%ROWTYPE;
  v_legal               listing_legal_metadata%ROWTYPE;

  -- Profile fields
  v_owner_verified      boolean := false;
  v_owner_exists        boolean := false;

  -- Media counts
  v_media_img_count     integer := 0;
  v_media_vid_count     integer := 0;

  -- EAV fallback for legacy listings (no legal_metadata row yet)
  v_legal_attr_val      text;

  -- Description length
  v_desc_len            integer := 0;

  -- Sub-scores
  v_photo_score         smallint := 0;
  v_gps_score           smallint := 0;
  v_legal_score         smallint := 0;
  v_seller_score        smallint := 0;
  v_infra_score         smallint := 0;
  v_agri_score          smallint := 0;
  v_text_score          smallint := 0;
  v_video_score         smallint := 0;
  v_total               smallint := 0;
  v_tier                text;
BEGIN
  -- ── 0. Fetch base listing ──────────────────────────────────────────────────
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── 0. Fetch sub-entities (may be NOT FOUND — that's fine) ────────────────
  SELECT * INTO v_infra FROM listing_infrastructure WHERE listing_id = p_listing_id;
  SELECT * INTO v_agri  FROM listing_agriculture     WHERE listing_id = p_listing_id;
  SELECT * INTO v_legal FROM listing_legal_metadata  WHERE listing_id = p_listing_id;

  -- ── 0. Profile ─────────────────────────────────────────────────────────────
  IF v_listing.owner_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_listing.owner_id),
           COALESCE(
             (SELECT is_verified FROM profiles WHERE id = v_listing.owner_id LIMIT 1),
             false
           )
    INTO v_owner_exists, v_owner_verified;
  END IF;

  -- ── 0. Media counts ────────────────────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE type = 'image'),
    COUNT(*) FILTER (WHERE type = 'video')
  INTO v_media_img_count, v_media_vid_count
  FROM listing_media
  WHERE listing_id = p_listing_id;

  -- ── 0. Description length ──────────────────────────────────────────────────
  v_desc_len := length(COALESCE(v_listing.description, ''));

  -- ── 1. Photo score (max 20) ────────────────────────────────────────────────
  v_photo_score := CASE
    WHEN v_media_img_count >= 5 THEN 20
    WHEN v_media_img_count >= 3 THEN 16
    WHEN v_media_img_count >= 2 THEN 12
    WHEN v_media_img_count >= 1 THEN  6
    ELSE 0
  END;

  -- ── 2. GPS score (max 10) ──────────────────────────────────────────────────
  IF v_infra.lat IS NOT NULL AND v_infra.lng IS NOT NULL THEN
    v_gps_score := 10;
  END IF;

  -- ── 3. Legal score (max 15) ────────────────────────────────────────────────
  -- Priority: normalized table → EAV fallback for legacy listings
  IF v_legal.listing_id IS NOT NULL THEN
    v_legal_score := CASE v_legal.legal_doc_type
      WHEN 'so_do'    THEN 15
      WHEN 'so_hong'  THEN 15
      WHEN 'giay_tay' THEN  7
      WHEN 'pending'  THEN  3
      WHEN 'contract' THEN  3
      ELSE 0
    END;
  ELSE
    -- EAV fallback: listing_attribute_values.key = 'legal_status'
    SELECT value_text INTO v_legal_attr_val
    FROM listing_attribute_values
    WHERE listing_id = p_listing_id AND key = 'legal_status'
    LIMIT 1;

    v_legal_score := CASE v_legal_attr_val
      WHEN 'so_do'    THEN 12
      WHEN 'so_hong'  THEN 12
      WHEN 'giay_tay' THEN  5
      ELSE 0
    END;
  END IF;

  -- ── 4. Seller score (max 10) ───────────────────────────────────────────────
  IF v_owner_verified THEN
    v_seller_score := 10;
  ELSIF v_owner_exists THEN
    v_seller_score := 3;
  END IF;

  -- ── 5. Infrastructure score (max 15) ──────────────────────────────────────
  IF v_infra.listing_id IS NOT NULL THEN
    v_infra_score := 5;  -- base: any infra row exists
    IF v_infra.road_access IS NOT NULL THEN
      v_infra_score := v_infra_score + 5;
    END IF;
    IF v_infra.water_source IS NOT NULL THEN
      v_infra_score := v_infra_score + 5;
    END IF;
  END IF;

  -- ── 6. Agriculture score (max 20) ─────────────────────────────────────────
  IF v_agri.listing_id IS NOT NULL THEN
    v_agri_score := 5;  -- base: any agri row exists
    IF v_agri.soil_type IS NOT NULL THEN
      v_agri_score := v_agri_score + 5;
    END IF;
    IF v_agri.current_crops IS NOT NULL
       AND array_length(v_agri.current_crops, 1) > 0 THEN
      v_agri_score := v_agri_score + 5;
    END IF;
    IF v_agri.certifications IS NOT NULL
       AND array_length(v_agri.certifications, 1) > 0 THEN
      v_agri_score := v_agri_score + 5;
    END IF;
  END IF;

  -- ── 7. Text score (max 5) ──────────────────────────────────────────────────
  v_text_score := CASE
    WHEN v_desc_len >= 300 THEN 5
    WHEN v_desc_len >= 80  THEN 3
    WHEN v_desc_len >  0   THEN 1
    ELSE 0
  END;

  -- ── 8. Video score (max 5) ─────────────────────────────────────────────────
  IF v_media_vid_count > 0 THEN
    v_video_score := 5;
  END IF;

  -- ── Totals ─────────────────────────────────────────────────────────────────
  v_total := v_photo_score + v_gps_score  + v_legal_score + v_seller_score
           + v_infra_score + v_agri_score + v_text_score  + v_video_score;

  v_tier := CASE
    WHEN v_total >= 90 THEN 'platinum'
    WHEN v_total >= 75 THEN 'gold'
    WHEN v_total >= 55 THEN 'silver'
    ELSE 'bronze'
  END;

  -- ── Upsert ─────────────────────────────────────────────────────────────────
  INSERT INTO listing_completeness (
    listing_id,
    total_score, photo_score, gps_score, legal_score, seller_score,
    infra_score, agri_score,  text_score, video_score,
    tier,
    has_gps, has_infra, has_agriculture, has_video,
    computed_at
  ) VALUES (
    p_listing_id,
    v_total, v_photo_score, v_gps_score, v_legal_score, v_seller_score,
    v_infra_score, v_agri_score, v_text_score, v_video_score,
    v_tier,
    (v_gps_score > 0),
    (v_infra_score > 0),
    (v_agri_score > 0),
    (v_video_score > 0),
    now()
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    total_score  = EXCLUDED.total_score,
    photo_score  = EXCLUDED.photo_score,
    gps_score    = EXCLUDED.gps_score,
    legal_score  = EXCLUDED.legal_score,
    seller_score = EXCLUDED.seller_score,
    infra_score  = EXCLUDED.infra_score,
    agri_score   = EXCLUDED.agri_score,
    text_score   = EXCLUDED.text_score,
    video_score  = EXCLUDED.video_score,
    tier         = EXCLUDED.tier,
    has_gps      = EXCLUDED.has_gps,
    has_infra    = EXCLUDED.has_infra,
    has_agriculture = EXCLUDED.has_agriculture,
    has_video    = EXCLUDED.has_video,
    computed_at  = now();
END;
$$;

COMMENT ON FUNCTION compute_listing_completeness(uuid) IS
  'Computes and persists a 0-100 completeness score for a land listing. '
  'Call after any mutation to listings, listing_media, listing_infrastructure, '
  'listing_agriculture, listing_legal_metadata, or profiles.is_verified.';
