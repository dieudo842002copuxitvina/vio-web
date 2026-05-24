# Marketplace Entities

## Core Commerce Nodes

VIO LOCAL has three primary commerce entity types. Each node **must** be anchored to both a **Business Identity** (Layer 2) and a **Geographic node** (Layer 1) to be indexed.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     LAND     │     │   PRODUCTS   │     │   SERVICES   │
│  (land_      │     │  (products)  │     │  (services)  │
│  listings)   │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └──────────┬─────────┘                    │
                  │                              │
         ┌────────▼────────┐          ┌──────────▼──────────┐
         │    BUSINESS     │          │     GEO NODE        │
         │  (profiles /    │          │  province_id        │
         │   businesses)   │          │  district_id        │
         └─────────────────┘          │  ward_id            │
                  │                   │  location (PostGIS) │
                  └───────────────────┘
```

---

## Land Listings (`land_listings`)

The primary commerce node for VIO LOCAL Phase 1.

**Key fields:**
- `land_type` — enum: `lua | rau_mau | cay_lau_nam | an_trai | lam_nghiep | mat_nuoc | hon_hop`
- `current_crops` — JSONB array of crop strings (e.g., `["Sầu riêng", "Bơ"]`)
- `price_text` — human-readable formatted string (e.g., "3.5 Tỷ"). Source of truth for display.
- `location` — PostGIS GEOGRAPHY(Point, 4326) for map rendering and radius search.
- `moderation_status` — `pending | approved | rejected | hidden`. Only `approved + is_public = true` listings are visible to the public.
- `category_id` — FK to `land_categories` for thematic grouping beyond `land_type`.

**Lifecycle:**
```
Owner submits → moderation_status = 'pending', is_public = false
Admin approves → moderation_status = 'approved', is_public = true
Listing appears in SEO feed and search
```

---

## Land Categories (`land_categories`)

A thematic grouping layer above `land_type` for discovery UX (pills, filters).

```
id           SERIAL PRIMARY KEY
name         TEXT    -- "Rẫy sầu riêng"
slug         TEXT UNIQUE
emoji        TEXT    -- Display emoji for pill UI
sort_order   INT
```

---

## Inquiries (`inquiries`)

The lead capture node — connects a potential buyer to a listing.

```
id              UUID PK
land_listing_id UUID → land_listings.id
buyer_name      TEXT
buyer_phone     TEXT NOT NULL          ← minimum required field
message         TEXT
status          TEXT DEFAULT 'new'     ← new | negotiating | closed
created_at      TIMESTAMPTZ
```

Status transitions managed by the seller via Dashboard → Mini CRM.

---

## Business Profiles (`profiles`)

Every Supabase auth user has a corresponding row in `profiles` (auto-created by trigger).

```
id           UUID PK → auth.users.id
full_name    TEXT
avatar_url   TEXT
phone        TEXT
is_verified  BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ
```

`is_verified` is set by admin after OTP + identity check. Verified profiles show a blue checkmark on their listings.

---

## Entity Relationships at a Glance

```
auth.users
  └── profiles (1:1)
        └── land_listings (1:N)
              ├── land_listing_images (1:N)
              └── inquiries (1:N)
                    └── [status workflow in Dashboard]

provinces → districts → wards
  ↑ referenced by land_listings via province_id / district_id / ward_id
```

---

## Future Entities (Phase 2+)

| Entity | Table | Anchor |
|---|---|---|
| Farm produce | `products` | business_id + ward_id |
| Agricultural services | `services` | business_id + province_id |
| Business storefronts | `businesses` | profile_id + district_id |
| Reviews & ratings | `reviews` | polymorphic (entity_type + entity_id) |
