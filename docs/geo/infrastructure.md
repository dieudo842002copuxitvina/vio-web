# Geographic Infrastructure

## Layer 1: The Geographic Graph

Vietnam's administrative geography is a strict 3-level hierarchy. VIO LOCAL mirrors this exactly.

```
provinces   (63 records)
  id        SERIAL PRIMARY KEY
  code      CHAR(2)           -- Official Ministry of Home Affairs code
  name      TEXT              -- Short name (e.g., "Đồng Nai")
  name_full TEXT              -- Full official name (e.g., "Tỉnh Đồng Nai")
  slug      TEXT UNIQUE       -- URL-safe canonical (e.g., "dong-nai")
  type      TEXT              -- 'tinh' | 'thanh-pho-trung-uong'
  region    TEXT              -- 'mien-bac' | 'mien-trung' | 'mien-nam'
  lat, lng  FLOAT             -- Province centroid (for map centering)

  └── districts   (~700 records)
        id          SERIAL PRIMARY KEY
        province_id → provinces.id
        name        TEXT
        name_full   TEXT
        slug        TEXT              -- Unique within province
        type        TEXT              -- 'huyen' | 'quan' | 'thi-xa' | 'thanh-pho'

        └── wards   (~10,000 records)
              id          SERIAL PRIMARY KEY
              district_id → districts.id
              name        TEXT
              name_full   TEXT
              slug        TEXT
              type        TEXT        -- 'xa' | 'phuong' | 'thi-tran'
```

---

## Slug Canonicalization

- Slugs are generated once at data import and **never changed**.
- If an administrative unit is renamed (happens during mergers), the old slug becomes an entry in `geographic_aliases` and redirects `301` to the new canonical.

```
geographic_aliases
  alias_slug   TEXT NOT NULL
  entity_type  TEXT NOT NULL    -- 'province' | 'district' | 'ward'
  entity_id    INT  NOT NULL    -- References the canonical entity
```

Resolution flow:
```
Request: /dat-nong-nghiep/dong-nai-cu
  1. Query provinces WHERE slug = 'dong-nai-cu' → NULL
  2. Query geographic_aliases WHERE alias_slug = 'dong-nai-cu' → found, canonical = 'dong-nai'
  3. redirect('/dat-nong-nghiep/dong-nai', 301)
```

---

## PostGIS Radius Search

### Column definition (on `land_listings`)
```sql
location GEOGRAPHY(Point, 4326)
```
Always use `GEOGRAPHY` (not `GEOMETRY`) for real-world distance calculations. Geography uses spherical math; geometry uses flat-plane math. For Vietnam's scale, the error from flat geometry is ~0.3% — acceptable but geography is correct.

### Indexing
```sql
CREATE INDEX land_listings_location_idx
  ON land_listings USING GIST (location);
```

### RPC: `get_nearby_lands`
```sql
CREATE OR REPLACE FUNCTION get_nearby_lands(
  user_lat      FLOAT,
  user_lon      FLOAT,
  radius_meters INT DEFAULT 10000
)
RETURNS TABLE (
  -- All land_listings columns here
  distance_meters FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    l.*,
    ST_Distance(l.location, ST_Point(user_lon, user_lat)::geography) AS distance_meters
  FROM land_listings l
  WHERE
    l.is_public = true
    AND l.moderation_status = 'approved'
    AND l.location IS NOT NULL
    AND ST_DWithin(
      l.location,
      ST_Point(user_lon, user_lat)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 20;
$$;
```

### Client call (from `components/geo-matching-lands.tsx`)
```typescript
const { data } = await supabase.rpc('get_nearby_lands', {
  user_lat:      coords.latitude,
  user_lon:      coords.longitude,
  radius_meters: 10_000,
})
```

---

## Denormalization Strategy

Entities like `land_listings` store both:
- `location GEOGRAPHY` — for spatial queries
- `province_id, district_id, ward_id` — for fast `WHERE province_id = ?` filtering without spatial math

This is intentional. Never remove the FK columns in favor of pure spatial queries — the integer FK filters are 100× faster for browse/list pages that don't need distance.

---

## Geographic Seeding

Reference data source: [Vietnam General Statistics Office](https://www.gso.gov.vn) + [GADM](https://gadm.org/).
Seed scripts live in `scripts/seed-geo/`. Run once per environment. Never seed via application code.
