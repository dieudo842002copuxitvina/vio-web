# VIO LOCAL — Architecture Overview

## Platform summary

VIO LOCAL is a Vietnamese rural commerce and discovery platform. It connects farmers, local businesses, and buyers across all 63 provinces of Vietnam.

Current verticals: land marketplace, business directory.
Planned verticals: products, services, restaurants, tourism, rentals, ticketing, feed.

---

## Core principles

**SSR-first.** Every route that Google should index renders complete HTML on the server. Client JavaScript is additive — it enhances interactivity but is never required for content discovery.

**SEO as infrastructure.** Metadata, canonical URLs, JSON-LD schema, and sitemap generation are first-class concerns, not afterthoughts.

**FSD layering.** Code is organized by Feature-Sliced Design so ownership is clear and circular dependencies are impossible by convention.

**Apple HIG aesthetics.** UI follows iOS 17/18 design language: rounded surfaces, glassmorphism, 44pt tap targets, semantic system colors.

---

## Layer hierarchy (Feature-Sliced Design)

```
app/          ← Next.js App Router pages, layouts, route handlers
features/     ← Business feature modules (search, booking, auth, …)
entities/     ← Core business entities (listing, geo, category, …)
shared/       ← Reusable UI primitives, SEO helpers (no business logic)
lib/          ← Infrastructure adapters (Supabase, SEO, cache, geo)
```

### Import rules (enforced by convention)

- `app/` may import from anything below it
- `features/` may import from `entities/`, `shared/`, `lib/`
- `entities/` may import from `shared/`, `lib/`
- `shared/` may import from `lib/` only
- `lib/` has no internal imports — it wraps external packages only

**Never import upward.** `entities/` must not import from `features/`. `shared/` must not import from `entities/` or `features/`.

---

## Routing

Next.js App Router with route groups:

| Group | Purpose | Auth |
|---|---|---|
| `app/(public)/` | SEO-indexed public pages | Anonymous |
| `app/(dashboard)/` | Authenticated seller/admin | Required |
| `app/[province]/` | Province discovery hub | Anonymous |
| `app/dat-nong-nghiep/` | Land marketplace | Anonymous |

Route groups are invisible in URLs. `app/(public)/doanh-nghiep/[slug]/page.tsx` → `/doanh-nghiep/slug`.

---

## Authentication

Proxy-based middleware in `proxy.ts` (Next.js 16 convention — equivalent to middleware.ts in older versions):
- Runs on every request via `matcher`
- Calls `updateSession()` from `lib/supabase/middleware.ts` to refresh tokens
- Redirects unauthenticated users away from protected routes
- Redirects authenticated users away from auth pages

Server Components use `createClient()` from `lib/supabase/server.ts`.
Client Components use `createClient()` from `lib/supabase/client.ts`.
Admin Server Actions use `createAdminClient()` — bypasses RLS, never use in RSC.

---

## Data fetching patterns

### Server Components (preferred)
```typescript
import { createClient } from '@/lib/supabase/server'
import { publicApproved } from '@/lib/supabase/query-helpers'

const supabase = await createClient()
const { data } = await publicApproved(
  supabase.from('land_listings').select('slug, title')
)
```

### Feature service functions
Complex queries live in `features/*/services/`. Pages call these functions, not raw Supabase.

### Caching
`unstable_cache` from `next/cache` for expensive queries. Always pass `tags` for on-demand invalidation.

### Query moderation filter
**Always use `publicApproved()` for consumer-facing listing queries.** This is enforced at the helper level — never inline `.eq('is_public', true).eq('moderation_status', 'approved')`.

---

## SEO rendering rules

| Content type | Strategy |
|---|---|
| Province with ≥ threshold listings | `index, follow` |
| Province with < threshold | `noindex, follow` (thin page) |
| Province with 0 listings | `notFound()` |
| Listing detail | `index, follow` |
| Dashboard routes | `noindex` (blocked in robots.txt) |

Thresholds are centralized in `lib/seo/thin-page.ts`.

JSON-LD schema:
- `WebSite` + `SearchAction` — homepage (`lib/seo/schema.ts` + `shared/seo/JsonLd.tsx`)
- `LocalBusiness` — storefront detail pages (`shared/seo/SchemaMarkup.tsx`)

---

## Caching strategy

| Layer | Mechanism | TTL |
|---|---|---|
| Page-level ISR | `export const revalidate` | 300–3600 s |
| Data-layer | `unstable_cache` with tags | 900–3600 s |
| Static assets | `Cache-Control: immutable` | 1 year |
| Supabase images | `minimumCacheTTL` | 7 days |
