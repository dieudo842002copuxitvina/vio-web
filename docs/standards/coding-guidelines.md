# Coding Standards & Guidelines

## The Prime Directive

> **Server Components by default. Client Components by exception.**

Every component starts as a Server Component. It becomes a Client Component only when it requires browser APIs, React state, or event handlers. Document the reason in a comment when adding `'use client'`.

---

## Component Rules

### Server Components (default)
```typescript
// ✅ Correct — async Server Component fetching its own data
export async function LandFeed({ provinceId }: { provinceId: number }) {
  const supabase = await createClient()  // from @/lib/supabase/server
  const listings = await getLandListings(supabase, provinceId)
  return <ul>{listings.map(l => <LandListingCard key={l.id} {...l} />)}</ul>
}
```

### Client Components
```typescript
'use client'
// Reason: requires usePathname for active nav state
import { usePathname } from 'next/navigation'
```

**Client Component triggers (the only valid reasons):**
- `useState`, `useReducer`, `useEffect`, `useRef`
- `usePathname`, `useSearchParams`, `useRouter`
- Browser APIs: `navigator`, `window`, `document`, `localStorage`
- Event handlers on interactive elements that need JS logic
- Third-party libraries that import browser globals

---

## State Management

| State type | Tool | Location |
|---|---|---|
| Server/async data | Native `async/await` in Server Components | `features/*/services/` |
| Client server-state | React Query (`@tanstack/react-query`) | In hooks under `features/*/hooks/` |
| Client UI state (local) | `useState` | Co-located in the component |
| Client global UI state | Zustand | `stores/` directory, one store per domain |

**Never** use Zustand for server data. **Never** use `useEffect` to fetch data that could be fetched in a Server Component.

---

## TypeScript Rules

- **Strict mode is non-negotiable.** `tsconfig.json` has `"strict": true`. No `@ts-ignore` without a linked GitHub issue explaining why.
- **No `any` in production code.** Use `unknown` + type narrowing, or define a proper interface.
- **Interfaces for shapes, types for unions:**
  ```typescript
  interface LandListing { ... }         // ✅ object shape
  type LeadStatus = 'new' | 'closed'   // ✅ union
  type AnyListing = any                // ❌ banned
  ```
- **Export types from feature boundaries.** Types defined in `features/land-listings/types/index.ts` are imported everywhere. Never redefine them inline.
- **Supabase response types:** Cast with `as MyType`, never infer from `data` directly. Supabase returns `any` — the type cast is your contract with the schema.

---

## Tailwind CSS Rules

- **Tailwind classes only.** No inline `style={{}}` except for dynamic values that cannot be expressed as Tailwind classes (e.g., `style={{ width: \`${percent}%\` }}`).
- **No `@apply` in component files.** `@apply` is permitted only in `globals.css` for global base styles.
- **No arbitrary values for standard spacing.** Use the 4px grid: `p-4` (16px), not `p-[15px]`.
- **Responsive prefixes are mobile-first:** `sm:` means ≥ 640px, `md:` means ≥ 768px.
- **Dark mode via `dark:` prefix only.** Never conditionally apply dark classes via JS.
- **Class ordering convention:** layout → spacing → typography → color → effects → interactive states. (Enforced by Prettier + Tailwind plugin.)

---

## File & Naming Conventions

```
Components:   PascalCase file + named export  →  LandListingCard.tsx → export function LandListingCard
Pages:        kebab-case directory + default export → dang-tin/page.tsx → export default function DangTinPage
Services:     camelCase function names → getLandListingDetail()
Types:        PascalCase interface names → interface LandListing {}
Constants:    SCREAMING_SNAKE_CASE → LAND_PAGE_SIZE, LAND_TYPE_LABELS
Actions:      verb + noun → submitInquiry, updateLeadStatus
```

---

## Performance Rules

- **No blocking waterfall fetches.** Parallel data fetching with `Promise.all()` when possible.
- **Images via `<img>` with explicit `width` + `height` OR `aspect-ratio` class.** Never let images cause layout shift.
- **`loading="eager"` only on hero/cover images.** All other images: `loading="lazy"`.
- **`revalidate = 3600`** on all public listing pages. `revalidate = 0` on dashboard pages.
- **No bundle imports of icon libraries.** Use inline SVG for icons — every icon library adds 50–100 KB.

---

## Error Handling

- Server Component data fetch failures → render error boundary or `notFound()`. Never let an unhandled error crash a page.
- Server Actions → always return typed result objects. Never `throw` to the client.
- Client Components → wrap Supabase calls in `try/catch` and surface errors in UI state (never `console.error` only).
- Empty states → every list/feed component must handle the 0-item case with a meaningful empty state UI.

---

## What is Forbidden

| Pattern | Reason |
|---|---|
| `any` type | Defeats TypeScript |
| `style={{}}` for static values | Use Tailwind |
| `useEffect` for data fetching | Use Server Component |
| Hardcoded color hex in TSX | Use CSS variables or Tailwind |
| `!important` in CSS | Specificity smell |
| `console.log` in production code | Use structured logging or remove |
| Importing server modules in Client Components | Will crash at runtime |
| `createAdminClient()` outside Server Actions / Route Handlers | Security breach |
