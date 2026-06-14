# Folder Structure

```
vio-web/
│
├── app/                          ← Next.js App Router
│   ├── (public)/                 ← Public SEO pages (route group)
│   │   ├── doanh-nghiep/[slug]/  ← Business profiles
│   │   ├── login/                ← Canonical auth page
│   │   ├── layout.tsx            ← Public shell (TopNav + BottomTabBar)
│   │   ├── loading.tsx           ← Public group skeleton
│   │   └── error.tsx             ← Public group error boundary
│   ├── (dashboard)/              ← Authenticated pages (route group)
│   │   ├── dang-tin/             ← Post new listing
│   │   ├── ho-so/                ← User profile
│   │   ├── quan-ly/              ← Management hub
│   │   ├── quan-ly-leads/        ← CRM leads
│   │   ├── quan-ly-lich-hen/     ← Appointment management
│   │   ├── layout.tsx            ← Dashboard shell (sidebar + mobile header)
│   │   └── error.tsx             ← Dashboard error boundary
│   ├── dat-nong-nghiep/          ← Land marketplace
│   │   ├── [province]/           ← Province-filtered listings
│   │   ├── chi-tiet/[slug]/      ← Listing detail
│   │   └── page.tsx              ← National index
│   ├── [province]/               ← Province discovery hub
│   │   └── [district]/           ← District discovery
│   ├── dashboard/                ← Dashboard home (outside route group)
│   ├── dang-nhap/                ← Redirect → /login
│   ├── actions/                  ← Server Actions (inquiry, lead-status)
│   ├── auth/signout/             ← Auth Route Handler
│   ├── error.tsx                 ← Root error boundary
│   ├── layout.tsx                ← Root HTML shell
│   ├── page.tsx                  ← Homepage
│   ├── robots.ts                 ← robots.txt generation
│   └── sitemap.ts                ← sitemap.xml generation
│
├── features/                     ← Business feature modules
│   ├── auth/api/                 ← Auth server actions
│   ├── booking/                  ← BookingSheet + booking actions
│   ├── land-listings/            ← Listing queries + types
│   ├── o2o/                      ← O2O routing logic
│   ├── search/                   ← Universal search
│   │   ├── api/search.server.ts  ← universalSearch(), getTrending()
│   │   ├── components/           ← SearchOverlay (Client Component)
│   │   ├── ui/                   ← LandSearchAutocomplete (Client Component)
│   │   └── types.ts
│   └── storefronts/              ← Storefront service + types
│
├── entities/                     ← Core business entities
│   ├── listing/                  ← Universal listing card foundation
│   │   ├── ui/listing-card.tsx   ← Base card (all verticals)
│   │   ├── ui/land-listing-card.tsx ← Land-specific card
│   │   └── index.ts
│   ├── category/                 ← Category tree queries + types
│   └── geo/                      ← Province/district/ward queries + types
│
├── shared/                       ← Reusable, business-agnostic
│   ├── ui/                       ← UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── skeleton.tsx          ← Skeleton shimmer primitive
│   │   └── utils.ts             ← cn() class merger
│   └── seo/                      ← SEO rendering helpers
│       ├── JsonLd.tsx            ← Generic JSON-LD renderer
│       └── SchemaMarkup.tsx      ← Typed schema renderer (LocalBusiness, Product, …)
│
├── lib/                          ← Infrastructure adapters (no business logic)
│   ├── supabase/
│   │   ├── server.ts             ← Server-side Supabase client (SSR)
│   │   ├── client.ts             ← Browser Supabase client (singleton)
│   │   ├── middleware.ts         ← updateSession() for proxy.ts
│   │   └── query-helpers.ts     ← publicApproved(), publicOnly(), activeOnly()
│   ├── seo/
│   │   ├── schema.ts             ← JSON-LD builder functions
│   │   └── thin-page.ts          ← Thin page thresholds + robots directives
│   ├── geo/types.ts              ← Province/district/ward TypeScript types
│   └── discovery/queries.ts      ← Province/district storefront queries
│
├── components/                   ← Legacy — migrating to FSD layers
│   │                               Shims remain here; delete after callers updated
│   ├── land-listing-card.tsx     ← → entities/listing/ui/
│   ├── land-search-autocomplete.tsx ← → features/search/ui/
│   ├── search-autocomplete.tsx   ← → features/search/ui/ (future)
│   ├── category-pills.tsx        ← → features/categories/ui/ (future)
│   ├── geo-matching-lands.tsx    ← → features/land-listings/ui/ (future)
│   ├── inquiry-form.tsx          ← → features/inquiries/ui/ (future)
│   ├── seller-card.tsx           ← → entities/storefront/ui/ (future)
│   └── layout/                   ← → shared/ui/layout/ or app/ (future)
│
├── proxy.ts                      ← Next.js 16 Proxy (= middleware in prior versions)
├── next.config.ts                ← Images, headers, redirects, compression
├── .env.local                    ← Local secrets (git-ignored)
├── .env.example                  ← Template for new contributors
└── docs/architecture/            ← This documentation
```

## Naming conventions

| Layer | File naming |
|---|---|
| Server-only modules | `*.server.ts` |
| Client Components | `PascalCase.tsx` (explicit `'use client'` inside) |
| Server Components | `page.tsx`, `layout.tsx`, or `PascalCase.tsx` (no directive needed) |
| Types | `types.ts` or `model/types.ts` |
| Server Actions | Named exports in `*.server.ts` with `'use server'` directive |

## The `components/` migration path

Files in `components/` are being migrated to their correct FSD layers. Each migrated file is replaced with a re-export shim so existing imports don't break. Once all callers of a shim import from the new canonical path, the shim file is deleted.

Do not add new files to `components/`. All new code goes directly into the correct FSD layer.
