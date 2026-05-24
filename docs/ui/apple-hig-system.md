# Apple HIG Design System

VIO LOCAL follows Apple's Human Interface Guidelines adapted for a Vietnamese rural marketplace context. The goal is **clarity, depth, and deference** — the UI steps back and lets content lead.

---

## Core Principles

1. **Clarity** — Text is legible at every size. Icons are unambiguous. Contrast ratios meet WCAG AA minimum.
2. **Depth** — Layers communicate hierarchy through shadow, blur, and translucency — not hard borders.
3. **Deference** — The UI does not compete with the content (land photos, product images). Backgrounds recede; content advances.

---

## Spacing Scale

All spacing values are multiples of **4px (0.25rem)**. Prefer named Tailwind utilities over arbitrary values.

| Token | Value | Use case |
|---|---|---|
| `gap-1` | 4px | Icon-to-label gap |
| `gap-2` | 8px | Chip / tag internal padding |
| `gap-3` | 12px | Card internal row spacing |
| `gap-4` | 16px | Section column gap |
| `gap-6` | 24px | Between blocks within a section |
| `gap-8` | 32px | Between major sections |
| `px-4 py-16` | 16/64px | Standard page horizontal / section vertical padding |

**Avoid** arbitrary spacing like `p-[13px]`. If the design needs it, round to the nearest 4px.

---

## Typography

- **Font:** Inter (loaded via `next/font/google`, variable `--font-inter`). System fallback: `-apple-system, ui-sans-serif`.
- **Size scale:** `text-xs` (12) · `text-sm` (14) · `text-base` (16) · `text-lg` (18) · `text-xl` (20) · `text-2xl` (24) · `text-3xl` (30) · `text-[2.5rem]` (40) max for page titles.
- **Weight:** Regular (400) for body; Semibold (600) for UI labels; Bold (700) for headings and prices; never use 900.
- **Tracking:** `-tracking-tight` on headings ≥ `text-2xl`. `tracking-[0.1em]` on uppercase category labels only.

---

## Color Palette (CSS Custom Properties)

```css
/* Defined in app/globals.css */
--lagoon-deep:  #0071E3   /* Primary action, links */
--palm:         #34C759   /* Success, price, eco badge */
--sea-ink:      #1C1C1E   /* Primary text (dark-mode white) */
--muted:        #8E8E93   /* Tertiary labels */
--bg-base:      #F2F2F7   /* App background */
--surface:      #FFFFFF   /* Card / panel surface */
--line:         rgba(60,60,67,0.12)  /* Dividers */
```

Never hardcode hex values in component files. Reference CSS variables or their mapped Tailwind equivalents.

> **Tailwind v4 note:** This project uses Tailwind v4 (`@import "tailwindcss"`). There is no `tailwind.config.ts`. All theme customisation lives in the `@theme {}` block inside `app/globals.css`.

---

## VIO Brand Tokens (Tailwind utilities)

| Utility class | Value | Use |
|---|---|---|
| `bg-vio-primary` / `text-vio-primary` | `#34C759` | Agricultural green — success, price, eco badge |
| `bg-vio-earth` / `text-vio-earth` | `#8B6654` | Warm earth brown — soil, rural warmth accents |
| `bg-vio-surface` | `#F2F2F7` | App background (same as `var(--bg-base)`) |
| `shadow-apple-soft` | `0 4px 24px rgba(0,0,0,0.04)` | Default card shadow |
| `shadow-apple-card` | `0 2px 16px rgba(0,0,0,0.08)` | Elevated card / modal shadow |
| `rounded-4xl` | `2rem` | Signature VIO card corner radius |

---

## Component Conventions

### Cards
```
rounded-[2rem]          ← land listing card (large content cards)
rounded-3xl             ← form blocks, sidebar panels
rounded-2xl             ← inner widgets, spec items
rounded-xl              ← inputs, small chips
rounded-full            ← buttons (primary CTA), pills, avatars
```

### Surfaces & Depth
- Elevated card: `shadow-[0_2px_16px_rgb(0,0,0,0.08)]` — never `shadow-md`
- Glass / blur: `backdrop-blur-xl bg-white/80` — used for sticky bars and modals
- No hard `border` on content cards unless required for accessibility contrast. Use shadow instead.
- `border border-gray-100` is permitted on form blocks and sidebar panels where shadow feels too heavy.

### Buttons
- **Primary CTA:** `rounded-full bg-black text-white py-4 px-8 font-bold` — full-width on mobile
- **Secondary:** `rounded-full bg-gray-100 text-gray-700` — same shape, neutral surface
- **Destructive:** `rounded-full bg-red-500 text-white` — only for irreversible actions
- **Active/Press state:** `active:scale-95 active:opacity-70 transition-all`

---

## Mobile Navigation

- **Bottom Tab Bar** for primary navigation on mobile (≤ 767px). Fixed at bottom with `safe-area-inset-bottom` padding.
- **Sidebar** visible only on desktop (≥ 768px) in the Dashboard section.
- Touch targets: minimum `44×44px` (iOS HIG requirement). Enforce with `min-h-[44px] min-w-[44px]`.
- **No hover-only interactions.** Every hover effect must have a touch/focus equivalent.

---

## Dark Mode

- All components must support `dark:` variants.
- Background hierarchy in dark mode: `black` → `#1C1C1E` → `#2C2C2E` → `#3A3A3C`.
- Never use `dark:bg-gray-800` — use the explicit `#` values above to match iOS dark mode exactly.
- Text: `dark:text-white` (primary) · `dark:text-gray-400` (secondary) · `dark:text-gray-600` (tertiary/placeholder).
