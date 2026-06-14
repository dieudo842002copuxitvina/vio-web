-- ── 003_search_engine.sql ──────────────────────────────────────────────────────
-- Full-text search engine for VIO LOCAL.
-- Adds: unaccent + pg_trgm extensions, search_logs table, rebuilt search_vector
-- triggers (now unaccented), trigram GIN indexes, search_vector on storefronts,
-- and three RPCs: search_listings, autocomplete_listings, search_autocomplete.
--
-- Safe to re-run. All CREATE statements use IF NOT EXISTS / OR REPLACE.

-- ── Extensions ────────────────────────────────────────────────────────────────

create extension if not exists unaccent  with schema extensions;
create extension if not exists pg_trgm   with schema extensions;

-- Make unaccent() callable without schema prefix from SECURITY DEFINER functions
create or replace function unaccent(text)
  returns text language sql immutable parallel safe strict
  as $$ select extensions.unaccent('extensions.unaccent', $1) $$;

-- ── search_logs ───────────────────────────────────────────────────────────────
-- Drives trending searches. Upserted on every search (fire-and-forget).

create table if not exists search_logs (
  query            text        primary key,
  count            integer     not null default 1,
  last_searched_at timestamptz not null default now()
);

create index if not exists search_logs_count_idx
  on search_logs (count desc, last_searched_at desc);

-- ── Rebuild listings search_vector trigger to use unaccent() ──────────────────
-- Tokens are now stored without diacritics so queries like "dat nong nghiep"
-- match listings titled "Đất nông nghiệp" correctly.

create or replace function listings_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.title,             ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.short_description, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.location_text,     ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description,       ''))), 'D');
  return new;
end;
$$;

-- Re-create trigger (drop-then-create is idempotent here)
drop trigger if exists listings_search_vector_trigger on listings;
create trigger listings_search_vector_trigger
  before insert or update on listings
  for each row execute function listings_search_vector_update();

-- Rebuild existing rows (fires the trigger for each row)
update listings set updated_at = updated_at;

-- ── Trigram GIN index for fuzzy fallback ──────────────────────────────────────
-- Used by similarity() calls inside the search RPC when tsquery fails to match.

create index if not exists listings_title_trgm_idx
  on listings using gin (unaccent(title) extensions.gin_trgm_ops);

-- ── storefronts: add search_vector ───────────────────────────────────────────

alter table storefronts add column if not exists search_vector tsvector;
alter table storefronts add column if not exists updated_at    timestamptz not null default now();

create or replace function storefronts_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.business_name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description,   ''))), 'C');
  return new;
end;
$$;

drop trigger if exists storefronts_search_vector_trigger on storefronts;
create trigger storefronts_search_vector_trigger
  before insert or update on storefronts
  for each row execute function storefronts_search_vector_update();

create index if not exists storefronts_search_idx
  on storefronts using gin (search_vector);

-- Rebuild storefronts
update storefronts set updated_at = updated_at;

-- ── RPC: search_listings ──────────────────────────────────────────────────────
-- Primary ranked full-text search across all listing types.
-- Ranking = ts_rank + feature boosts (featured, verified, geo match, recency).
-- Fuzzy fallback via trigram similarity when tsquery returns no match.
--
-- Parameters:
--   q             — raw query string (normalization done inside)
--   p_type        — listing type filter ('land', 'service', …) or NULL = all
--   p_province_id — exact province match (also boosts rank_score +0.20)
--   p_district_id — exact district match (+0.15)
--   p_category_id — exact category match (+0.10)
--   p_price_min/max — filter on price_amount (numeric VND)
--   p_area_min/max  — filter on listing_attribute_values.value_number for area_m2
--   p_limit/offset  — pagination

create or replace function search_listings(
  q                text     default '',
  p_type           text     default null,
  p_province_id    integer  default null,
  p_district_id    integer  default null,
  p_category_id    integer  default null,
  p_price_min      numeric  default null,
  p_price_max      numeric  default null,
  p_area_min       numeric  default null,
  p_area_max       numeric  default null,
  p_limit          integer  default 20,
  p_offset         integer  default 0
)
returns table (
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
language plpgsql stable security definer
as $$
declare
  tsq            tsquery;
  q_norm         text;
  area_schema_id uuid;
begin
  -- Strip diacritics + lowercase; queries arrive pre-normalized from JS but
  -- we normalize again here so the function is safe to call directly from SQL.
  q_norm := lower(unaccent(trim(q)));

  -- Build tsquery (websearch syntax: "quoted phrase", -exclusion, OR)
  if q_norm <> '' then
    begin
      tsq := websearch_to_tsquery('simple', q_norm);
    exception when others then
      tsq := null;
    end;
  end if;

  -- Resolve area_m2 schema UUID once (only when area filter is active)
  if p_area_min is not null or p_area_max is not null then
    select s.id into area_schema_id
    from   listing_attribute_schemas s
    where  s.listing_type = 'land' and s.key = 'area_m2'
    limit  1;
  end if;

  return query
  select
    l.id,
    l.type::text,
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
      -- Base FTS relevance (ts_rank normalised by doc length: option 1)
      case when tsq is not null
        then ts_rank(l.search_vector, tsq, 1)
        else 0.0
      end

      -- Trigram similarity bonus when FTS rank is weak
      + case when q_norm <> '' and (tsq is null or ts_rank(l.search_vector, tsq, 1) < 0.05)
          then greatest(0.0, similarity(lower(unaccent(l.title)), q_norm) * 0.5)
          else 0.0
        end

      -- Feature boosts
      + case when l.is_featured  then 0.30 else 0.0 end
      + case when l.is_verified  then 0.10 else 0.0 end

      -- Geo context boosts (non-null parameter AND match)
      + case when p_province_id is not null and l.province_id = p_province_id then 0.20 else 0.0 end
      + case when p_district_id is not null and l.district_id = p_district_id then 0.15 else 0.0 end
      + case when p_category_id is not null and l.category_id = p_category_id then 0.10 else 0.0 end

      -- Recency: linear decay to 0 over 30 days
      + greatest(0.0, 0.05 * (1.0 - least(
            extract(epoch from (now() - l.updated_at)) / 2592000.0,
            1.0
          )))
    )::float4 as rank_score

  from listings l

  where
    l.is_public         = true
    and l.moderation_status = 'approved'
    and l.status            = 'published'

    -- Filters (NULL = no filter)
    and (p_type        is null or l.type::text  = p_type)
    and (p_province_id is null or l.province_id = p_province_id)
    and (p_district_id is null or l.district_id = p_district_id)
    and (p_category_id is null or l.category_id = p_category_id)
    and (p_price_min   is null or l.price_amount >= p_price_min)
    and (p_price_max   is null or l.price_amount <= p_price_max)

    -- Text match: FTS OR fuzzy fallback (empty query = browse all)
    and (
      q_norm = ''
      or (tsq is not null and l.search_vector @@ tsq)
      or (q_norm <> '' and similarity(lower(unaccent(l.title)), q_norm) > 0.20)
    )

    -- Area range via listing_attribute_values (land only)
    and (
      area_schema_id is null
      or exists (
        select 1 from listing_attribute_values av
        where  av.listing_id = l.id
        and    av.schema_id  = area_schema_id
        and    (p_area_min is null or av.value_number >= p_area_min)
        and    (p_area_max is null or av.value_number <= p_area_max)
      )
    )

  order by rank_score desc, l.updated_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

-- ── RPC: autocomplete_listings ────────────────────────────────────────────────
-- Fast prefix FTS for the search bar autocomplete dropdown.
-- Uses :* prefix operators so "dat no" matches "dat nong nghiep".
-- Returns up to p_limit listings, ranked by FTS rank + featured boost.

create or replace function autocomplete_listings(
  q           text,
  p_type      text    default null,
  p_province  integer default null,
  p_limit     integer default 8
)
returns table (
  type     text,
  slug     text,
  title    text,
  subtitle text,    -- price_text for listings
  score    float4
)
language plpgsql stable security definer
as $$
declare
  tsq    tsquery;
  q_norm text;
  q_pfx  text;
begin
  q_norm := lower(unaccent(trim(q)));
  if q_norm = '' or length(q_norm) < 2 then return; end if;

  -- Build prefix tsquery: "dat no" → 'dat:* & no:*'
  q_pfx := regexp_replace(q_norm, '(\S+)', '\1:*', 'g');
  q_pfx := regexp_replace(q_pfx,  '\s+',   ' & ',  'g');

  begin
    tsq := to_tsquery('simple', q_pfx);
  exception when others then
    tsq := null;
  end;

  if tsq is null then return; end if;

  return query
  select
    l.type::text,
    l.slug,
    l.title,
    l.price_text,
    (
      ts_rank(l.search_vector, tsq)
      + case when l.is_featured then 0.20 else 0.0 end
    )::float4
  from listings l
  where
    l.is_public         = true
    and l.moderation_status = 'approved'
    and l.status            = 'published'
    and (p_type    is null or l.type::text  = p_type)
    and (p_province is null or l.province_id = p_province)
    and l.search_vector @@ tsq
  order by 5 desc, l.updated_at desc
  limit p_limit;
end;
$$;

-- ── RPC: search_autocomplete ──────────────────────────────────────────────────
-- Multi-entity autocomplete: storefronts + provinces.
-- Called by the global search bar (not the land-specific one).
-- Returns { type, slug, name, subtitle } — name is used by the UI, not title.

create or replace function search_autocomplete(
  query        text,
  result_limit integer default 8
)
returns table (
  type     text,
  slug     text,
  name     text,
  subtitle text
)
language plpgsql stable security definer
as $$
declare
  q_norm text;
  q_pfx  text;
  tsq    tsquery;
  half   integer;
begin
  q_norm := lower(unaccent(trim(query)));
  if q_norm = '' or length(q_norm) < 2 then return; end if;

  half := greatest(1, result_limit / 2);

  q_pfx := regexp_replace(q_norm, '(\S+)', '\1:*', 'g');
  q_pfx := regexp_replace(q_pfx,  '\s+',   ' & ',  'g');

  begin
    tsq := to_tsquery('simple', q_pfx);
  exception when others then
    tsq := null;
  end;

  -- Storefronts (FTS if vector ready, ILIKE fallback otherwise)
  return query
  select
    'storefront'::text,
    sf.slug,
    sf.business_name,
    sf.description
  from storefronts sf
  where sf.is_public = true
    and (
      (tsq is not null and sf.search_vector is not null and sf.search_vector @@ tsq)
      or lower(unaccent(sf.business_name)) like '%' || q_norm || '%'
    )
  order by sf.is_verified desc, sf.updated_at desc
  limit half;

  -- Provinces (name + slug ILIKE — no vector needed, small table)
  return query
  select
    'province'::text,
    p.slug,
    p.name_full,
    null::text
  from provinces p
  where lower(unaccent(p.name_full)) like '%' || q_norm || '%'
     or lower(p.slug)                like '%' || q_norm || '%'
  limit half;
end;
$$;

-- ── RLS: grant execute on RPCs to anon + authenticated ───────────────────────

grant execute on function search_listings        to anon, authenticated;
grant execute on function autocomplete_listings  to anon, authenticated;
grant execute on function search_autocomplete    to anon, authenticated;
