# SEO Strategy

## Routing Matrix

VIO LOCAL generates URLs from the intersection of **Category × Geography**. Every valid intersection is a potential SEO page.

```
/[category]                        →  Category root (e.g. /dat-nong-nghiep)
/[category]/[province]             →  Province listing  (e.g. /dat-nong-nghiep/dong-nai)
/[category]/[province]/[district]  →  District listing  (e.g. /dat-nong-nghiep/dong-nai/dinh-quan)
/[category]/chi-tiet/[slug]        →  Entity detail page
```

**Do not add** `/[category]/[province]/[district]/[ward]` unless ward-level has ≥ 10 indexed entities. Ward pages with fewer items are `noindex`.

---

## Geographic Canonicalization

- Every province and district has one **canonical slug** (e.g., `dong-nai`).
- Aliases (e.g., old names, romanizations) are stored in `geographic_aliases` and resolve via `301 redirect` to the canonical URL.
- The `<link rel="canonical">` tag on every page points to the canonical slug form.
- Thin pages (< 3 entities) render as `noindex, follow`. The cutoff is defined in `lib/seo/thin-page.ts`.

---

## Anti-Thin-Page Rules

| Condition | Action |
|---|---|
| 0 entities | `notFound()` — no page rendered |
| 1–2 entities | `noindex, follow` — page exists, not indexed |
| 3–9 entities | `index, follow` — indexed but no pagination |
| 10+ entities | `index, follow` + paginated with `rel="next/prev"` |

---

## Metadata Requirements

Every public page **must** export:
- `title` (≤ 60 chars, includes geo + category keyword)
- `description` (≤ 160 chars, natural language)
- `openGraph.images` (1200×630 image URL)
- `alternates.canonical` (absolute URL to canonical slug)

Pages without a valid `generateMetadata` export must not ship to production.

---

## Structured Data (JSON-LD)

- Land listing pages → `schema.org/RealEstateListing`
- Business profile pages → `schema.org/LocalBusiness`
- Province/District listing pages → `schema.org/ItemList`

Inject via `<script type="application/ld+json">` in the Server Component — never client-side.
