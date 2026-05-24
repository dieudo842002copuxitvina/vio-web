# Core Architecture Philosophy

## Entity-First, Not Page-First

VIO LOCAL is built around **entities** (geographic nodes, businesses, land parcels, products) that exist independently of any single page. Pages are thin render layers over entities — they do not own data or define structure.

> A Province is an entity. `/dong-nai` is just a view of that entity.

---

## The 5 Architectural Layers

```
Layer 1 — Geographic Graph
  Provinces → Districts → Wards → Coordinates
  (PostGIS geometry, canonical slugs, alias resolution)

Layer 2 — Business Identity
  Storefronts, Farms, Individual Sellers
  (Profiles → Businesses → Verified Trust Signals)

Layer 3 — Commerce Nodes
  Land Listings, Products, Services
  (Each node anchored to Layer 1 + Layer 2)

Layer 4 — Discovery Engine
  Search, SEO Feeds, Category Routing, Geo Radius
  (Server-rendered for bots; personalized for users)

Layer 5 — Trust & Moderation
  OTP Verification, RLS Policies, Review Scores
  (Platform integrity — invisible to end users when working correctly)
```

---

## Rules

- **Entities own their canonical URL.** A land listing at `slug = rẫy-sầu-riêng-abc` always resolves to `/dat-nong-nghiep/chi-tiet/rẫy-sầu-riêng-abc`. The category or province page borrows from it.
- **No data duplication across layers.** Province names are stored once in `provinces`; every other table uses `province_id`.
- **Layer isolation is strict.** The Discovery layer reads from all layers below it but never writes. Commerce nodes never mutate Geographic data.
- **Pages are generated, not designed.** `/dat-nong-nghiep/dong-nai/dinh-quan` is a programmatic render of (Category × Province × District) — no custom template per location.
- **Mobile-first, bot-aware.** Every public entity page must render meaningful HTML before any JS executes (SSR/SSG). Client interactivity is progressive enhancement only.
