# Database Schema Design

## Platform: Supabase PostgreSQL + PostGIS

---

## Core Principles

- **UUIDv4** as primary key on all user-created entities (`land_listings`, `businesses`, `profiles`, `inquiries`). Sequential integers are reserved for geo reference tables only.
- **PostGIS** (`GEOGRAPHY(Point, 4326)`) on any table that needs radius search or map rendering. Never store lat/lng as two separate `FLOAT` columns on searchable entities.
- **JSONB** for flexible metadata that varies by entity sub-type (e.g., `metadata jsonb` on `businesses` stores category-specific fields without schema migration).
- **`updated_at` trigger** on all mutable tables via `moddatetime()` extension — never rely on application-level timestamp updates.
- **RLS enabled by default.** No table is created without a Row Level Security policy, even if the initial policy is `public read`.

---

## Geographic Graph

```sql
provinces   (id SERIAL, slug TEXT UNIQUE, name TEXT, name_full TEXT, ...)
  └── districts (id SERIAL, province_id → provinces.id, slug TEXT, ...)
        └── wards (id SERIAL, district_id → districts.id, slug TEXT, ...)
```

- Slugs are immutable after creation. Rename = new canonical + alias entry in `geographic_aliases`.
- `geographic_aliases (alias_slug, entity_type, entity_id)` handles all historical or alternate slugs.

---

## Commerce Tables

```
land_listings
  - id UUID PK
  - owner_id UUID → auth.users
  - slug TEXT UNIQUE NOT NULL
  - location GEOGRAPHY(Point, 4326)        ← PostGIS column
  - province_id, district_id, ward_id      ← denormalized FK for fast filtering
  - land_type TEXT (enum-like)
  - current_crops JSONB                    ← array of crop strings
  - metadata JSONB                         ← soil_type, water_source, etc.
  - price_text TEXT                        ← human-formatted price
  - moderation_status TEXT DEFAULT 'pending'
  - is_public BOOLEAN DEFAULT false

land_listing_images
  - id SERIAL PK
  - land_listing_id UUID → land_listings.id ON DELETE CASCADE
  - image_url TEXT NOT NULL
  - sort_order INT DEFAULT 0

inquiries
  - id UUID PK DEFAULT gen_random_uuid()
  - land_listing_id UUID → land_listings.id
  - buyer_name TEXT
  - buyer_phone TEXT NOT NULL
  - message TEXT
  - status TEXT DEFAULT 'new'             ← new | negotiating | closed
  - created_at TIMESTAMPTZ DEFAULT now()
```

---

## RPC Functions (PostGIS)

```sql
-- Radius search — used by GeoMatchingLands component
get_nearby_lands(user_lat FLOAT, user_lon FLOAT, radius_meters INT)
RETURNS TABLE (... all land_listing columns ..., distance_meters FLOAT)
AS $$
  SELECT *, ST_Distance(location, ST_Point(user_lon, user_lat)::geography)
  FROM land_listings
  WHERE ST_DWithin(location, ST_Point(user_lon, user_lat)::geography, radius_meters)
    AND is_public = true AND moderation_status = 'approved'
  ORDER BY distance_meters ASC
$$ LANGUAGE sql STABLE;
```

---

## JSONB Usage Policy

- Use JSONB **only** for fields that:
  1. Vary per category/sub-type, OR
  2. Are arrays of primitives (e.g., `current_crops`, `tags`)
- Do **not** use JSONB for fields that are filtered or sorted at query time — those must be dedicated columns with indexes.
- Always add a GIN index on JSONB columns that are queried with `@>` or `?` operators.
