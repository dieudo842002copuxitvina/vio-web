# SEO-Safe Feed Distribution

## Two Distinct Feeds, Two Distinct Architectures

VIO LOCAL operates two parallel feed systems with fundamentally different rendering strategies. They **must never be merged** into a single implementation.

---

## Feed 1: Public SEO Feed (SSR + Pagination)

**Purpose:** Discoverable by Googlebot, Zalobot, Facebook scraper.
**Rendering:** Server-side rendered HTML with full `<head>` metadata.
**Location:** `app/(public)/dat-nong-nghiep/` and all geo sub-pages.

### Rules
- All data fetched at request time in Server Components (no `useEffect`, no client fetch).
- `export const revalidate = 3600` — full ISR cache, refreshed hourly.
- Must export `generateMetadata()` returning complete OG/Twitter/canonical data.
- Pagination via URL params (`?page=2`) with `rel="prev"` / `rel="next"` link tags.
- Max 20 items per page (controlled by `LAND_PAGE_SIZE` constant).
- Thin pages (< 3 items): render `noindex` meta but **do not 404** — content may grow.
- Empty pages (0 items): call `notFound()` — no shell page for bots to index.

### What this feed must NOT do
- Infinite scroll (JS-only, bot-invisible)
- Client-side filtering without URL reflection
- Dynamic imports that delay LCP

---

## Feed 2: Personalized App Feed (Client, Infinite Scroll)

**Purpose:** Logged-in user experience — personalized, filtered, private.
**Rendering:** Client Component, initial skeleton → data from Supabase client.
**Location:** `app/(dashboard)/` and future authenticated discovery views.

### Rules
- Infinite scroll via `IntersectionObserver` + cursor-based pagination (not offset).
- Filter state lives in URL params (for deep-link sharing) synced with `useSearchParams`.
- Each page of results fetched via Supabase client (browser), respecting RLS.
- No `generateMetadata` needed — these pages are `noindex` by definition (authenticated).
- Loading state shows Skeleton cards matching the real card dimensions (no layout shift).

### Cursor-based pagination pattern
```typescript
// Use `id` as cursor, not `offset` — stable across concurrent inserts
.from('land_listings')
.select('*')
.order('created_at', { ascending: false })
.order('id',         { ascending: false })   // tiebreaker
.lt('created_at', lastSeenCreatedAt)
.limit(20)
```

---

## Boundary Rules

| Rule | SEO Feed | App Feed |
|---|---|---|
| Robots allowed | Yes | No (`noindex`) |
| Requires auth | No | Yes |
| Data source | Server Component | Supabase browser client |
| Pagination style | URL page param | Cursor / IntersectionObserver |
| Cache | ISR 3600s | No cache (always fresh) |
| Filter state | URL search params (SSR-aware) | URL search params (client-synced) |
| `generateMetadata` | Required | Omit |

---

## The Handoff Point

When a user logs in, they transition from the SEO Feed to the App Feed. The URL structure remains the same (`/dat-nong-nghiep`) but the rendering strategy switches based on auth state. This is achieved by checking session in the layout and conditionally rendering the personalized feed component.

Never render personalized content (based on user history, location, preferences) on SEO-indexed pages. Personalization = dynamic = uncacheable = poor SEO.
