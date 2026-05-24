// ── Canonical types live in lib/geo/types.ts (imported by existing route pages).
// Re-export them here as the FSD entity layer entry point so new feature code
// imports from '@/entities/geo' rather than the lib internals directly.

export type {
  GeoEntityType,
  GeoRegion,
  GeoAliasReason,
  Province,
  District,
  Ward,
} from '@/lib/geo/types'

// ── Lean routing types ─────────────────────────────────────────────────────
// Minimal shape needed for navigation, breadcrumbs, and select dropdowns.
// Avoids pulling full DB row shapes into UI components that only need slugs.

export interface ProvinceRoute {
  code: string
  name: string
  slug: string
}

export interface DistrictRoute {
  code:        string
  name:        string
  slug:        string
  province_id: number
}

export interface WardRoute {
  code:        string
  name:        string
  slug:        string
  district_id: number
}
