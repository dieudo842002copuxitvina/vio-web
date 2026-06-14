-- ── 001_create_listings.sql ───────────────────────────────────────────────────
-- Universal multi-vertical listings table.
-- SAFE: does not alter or reference land_listings. Run on production at any time.
-- Apply via: supabase db push  OR paste into Supabase SQL editor.

-- ── Enums ─────────────────────────────────────────────────────────────────────

do $$ begin
  create type listing_type_enum as enum (
    'land', 'product', 'service', 'restaurant', 'tourism', 'rental', 'event'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status_enum as enum (
    'draft', 'published', 'paused', 'expired', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_moderation_enum as enum (
    'pending', 'approved', 'rejected', 'hidden'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_price_type_enum as enum (
    'fixed', 'negotiable', 'on_request', 'free',
    'per_unit', 'per_night', 'per_person'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_media_type_enum as enum ('image', 'video');
exception when duplicate_object then null; end $$;

-- ── listings ──────────────────────────────────────────────────────────────────

create table if not exists listings (
  id                uuid                      primary key default gen_random_uuid(),
  type              listing_type_enum         not null,
  slug              text                      not null,
  title             text                      not null,
  short_description text,
  description       text,
  cover_url         text,

  -- Geo (no FK — province/district table names may vary)
  province_id       integer,
  district_id       integer,
  location_text     text,

  -- Pricing
  price_amount      numeric(18, 2),
  price_unit        text,                    -- 'vnd' | 'usd' | 'ty_vnd'
  price_text        text,                    -- pre-formatted: "1.5 Tỷ"
  price_type        listing_price_type_enum,

  -- Status
  status            listing_status_enum       not null default 'draft',
  moderation_status listing_moderation_enum   not null default 'pending',
  is_public         boolean                   not null default false,
  is_featured       boolean                   not null default false,
  is_verified       boolean                   not null default false,

  -- Taxonomy
  category_id       integer,

  -- Ownership (storefront_id is nullable — not all listings belong to a storefront)
  owner_id          uuid                      references auth.users(id) on delete set null,
  storefront_id     uuid,

  -- Contact
  contact_phone     text,
  contact_zalo      text,
  contact_email     text,

  -- Full-text search (populated by trigger below)
  search_vector     tsvector,

  -- Lifecycle
  published_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz               not null default now(),
  updated_at        timestamptz               not null default now(),

  -- Slug must be globally unique (type is part of routing, not uniqueness)
  constraint listings_slug_unique unique (slug)
);

-- ── listing_media ─────────────────────────────────────────────────────────────

create table if not exists listing_media (
  id          uuid                      primary key default gen_random_uuid(),
  listing_id  uuid                      not null references listings(id) on delete cascade,
  url         text                      not null,
  alt         text,
  type        listing_media_type_enum   not null default 'image',
  sort_order  integer                   not null default 0,
  created_at  timestamptz               not null default now()
);

-- ── listing_tags ──────────────────────────────────────────────────────────────

create table if not exists listing_tags (
  id          uuid  primary key default gen_random_uuid(),
  listing_id  uuid  not null references listings(id) on delete cascade,
  tag         text  not null,
  constraint  listing_tags_unique unique (listing_id, tag)
);

-- ── listing_attribute_values ──────────────────────────────────────────────────
-- Stores vertical-specific attributes per listing.
-- Keys match category_attributes.key for the listing's category.
-- Only one of value_* columns will be non-null per row (type driven by category_attributes).

create table if not exists listing_attribute_values (
  id             uuid     primary key default gen_random_uuid(),
  listing_id     uuid     not null references listings(id) on delete cascade,
  key            text     not null,
  value_text     text,
  value_number   numeric,
  value_boolean  boolean,
  value_json     jsonb,                -- for arrays (multiselect) and nested values
  constraint listing_attribute_values_unique unique (listing_id, key)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create unique index if not exists listings_slug_idx        on listings (slug);
create        index if not exists listings_type_idx        on listings (type);
create        index if not exists listings_category_idx    on listings (category_id);
create        index if not exists listings_province_idx    on listings (province_id);
create        index if not exists listings_owner_idx       on listings (owner_id);
create        index if not exists listings_storefront_idx  on listings (storefront_id);

-- Composite index for the public feed query pattern
create index if not exists listings_feed_idx on listings (
  is_public, moderation_status, status, is_featured desc, published_at desc
);

-- Full-text search
create index if not exists listings_search_idx on listings using gin (search_vector);

-- Media ordered fetch
create index if not exists listing_media_listing_idx on listing_media (listing_id, sort_order);

-- Tag lookups
create index if not exists listing_tags_listing_idx on listing_tags (listing_id);
create index if not exists listing_tags_tag_idx     on listing_tags (tag);

-- Attribute lookups
create index if not exists listing_attr_listing_idx on listing_attribute_values (listing_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Shared updated_at helper (idempotent — other tables may already have this)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_updated_at on listings;
create trigger listings_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- Populate search_vector from title + short_description + location_text + description.
-- Weight A → title is the strongest signal; D → description is weakest.
create or replace function listings_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector =
    setweight(to_tsvector('simple', coalesce(new.title, '')),             'A') ||
    setweight(to_tsvector('simple', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.location_text, '')),     'C') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')),       'D');
  return new;
end;
$$;

drop trigger if exists listings_search_vector_trigger on listings;
create trigger listings_search_vector_trigger
  before insert or update on listings
  for each row execute function listings_search_vector_update();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table listings                 enable row level security;
alter table listing_media            enable row level security;
alter table listing_tags             enable row level security;
alter table listing_attribute_values enable row level security;

-- listings: public read (approved + published + public)
create policy "listings_public_read" on listings
  for select using (
    is_public         = true
    and moderation_status = 'approved'
    and status            = 'published'
  );

-- listings: owner can always read their own (for dashboard)
create policy "listings_owner_read_own" on listings
  for select using (auth.uid() = owner_id);

-- listings: owner CRUD
create policy "listings_owner_insert" on listings
  for insert with check (auth.uid() = owner_id);

create policy "listings_owner_update" on listings
  for update using (auth.uid() = owner_id);

create policy "listings_owner_delete" on listings
  for delete using (auth.uid() = owner_id);

-- listing_media: public read inherits from listing visibility
create policy "listing_media_public_read" on listing_media
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id
        and l.is_public         = true
        and l.moderation_status = 'approved'
        and l.status            = 'published'
    )
  );

create policy "listing_media_owner_read" on listing_media
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "listing_media_owner_write" on listing_media
  for all using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- listing_tags: same visibility pattern
create policy "listing_tags_public_read" on listing_tags
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id
        and l.is_public         = true
        and l.moderation_status = 'approved'
        and l.status            = 'published'
    )
  );

create policy "listing_tags_owner_write" on listing_tags
  for all using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- listing_attribute_values: same visibility pattern
create policy "listing_attr_public_read" on listing_attribute_values
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id
        and l.is_public         = true
        and l.moderation_status = 'approved'
        and l.status            = 'published'
    )
  );

create policy "listing_attr_owner_write" on listing_attribute_values
  for all using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );
