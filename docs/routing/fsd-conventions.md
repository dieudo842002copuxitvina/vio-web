# Routing & Feature-Sliced Design Conventions

## Mental Model

VIO LOCAL combines **Next.js App Router** (for file-system routing) with **Feature-Sliced Design** (for organizing shared code). The result:

- `app/` owns routes (thin render layers)
- `features/` owns domain logic (fat, tested, reusable)
- `components/` owns shared UI primitives
- `lib/` owns infrastructure (Supabase client, SEO utils, geo helpers)

---

## App Router Structure

```
app/
├── (public)/                      ← Route group: public-facing, Header + Footer
│   ├── page.tsx                   ← Home
│   ├── dat-nong-nghiep/
│   │   ├── page.tsx               ← Category root
│   │   ├── [province]/page.tsx    ← Province listing
│   │   └── chi-tiet/[slug]/page.tsx ← Entity detail
│   └── ho-kinh-doanh/...
│
├── (dashboard)/                   ← Route group: authenticated, Sidebar layout
│   ├── layout.tsx                 ← Auth guard + sidebar (no public Header/Footer)
│   ├── dashboard/page.tsx
│   ├── quan-ly-leads/page.tsx
│   └── dang-tin/page.tsx
│
└── layout.tsx                     ← Root layout: fonts, globals, metadata base
```

**Route group naming convention:**
- `(public)` — SEO-indexed, publicly accessible
- `(dashboard)` — authenticated, admin/seller facing
- `_components/` — co-located components (underscore prefix = not a route)

---

## Feature-Sliced Design Layers

```
features/
├── land-listings/
│   ├── types/index.ts             ← TypeScript interfaces + enums
│   ├── services/
│   │   ├── land-listings.ts       ← Query functions (take SupabaseClient)
│   │   └── land-listing-detail.ts ← Complex aggregation queries
│   └── hooks/                     ← Client-side React Query hooks (future)
│
├── businesses/
└── geo/
```

**Rules for `features/`:**
- Service functions always receive `SupabaseClient` as first argument — never create their own client instance.
- Service functions are pure async functions, no React hooks.
- Types are the ground truth — never infer types from Supabase response shapes inline in pages.

---

## Component Ownership

```
components/
├── land-listing-card.tsx    ← Shared display card (used in feed + nearby section)
├── category-pills.tsx       ← Server Component (fetches its own data)
├── geo-matching-lands.tsx   ← Client Component (uses navigator.geolocation)
├── inquiry-form.tsx         ← Client Component (useActionState)
├── seller-card.tsx          ← Presentational, no data fetching
└── layout/
    ├── header.tsx
    └── footer.tsx
```

**Component rules:**
- Components that fetch data must be Server Components (async function).
- Components with browser APIs (`navigator`, `window`, `localStorage`) must have `'use client'`.
- Never co-locate a Server Component and a Client Component in the same file when they share data — pass data down as props.

---

## Server Actions

```
app/actions/
├── inquiry.ts         ← submitInquiry(prevState, formData)
└── lead-status.ts     ← updateLeadStatus(id, status)
```

**Rules:**
- All Server Actions begin with `'use server'`.
- Actions call `revalidatePath()` or `revalidateTag()` after mutations.
- Actions never throw to the client — they return typed result objects `{ success: boolean, error?: string }`.
- Actions use the **server** Supabase client (`@/lib/supabase/server`), never the browser client.

---

## Public vs. Dashboard Separation

| Concern | Public `(public)` | Dashboard `(dashboard)` |
|---|---|---|
| Auth required | No | Yes (layout redirects) |
| Supabase client | Server (anon) | Server (anon) + Client (browser, for mutations) |
| Metadata export | Required | Optional |
| `revalidate` | 3600 (1h) | 0 (always fresh) |
| Components | Server-first | Client-ok (interactive) |
