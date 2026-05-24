import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import type { Province, District } from '../model/types'

// Geographic data almost never changes — 24 h TTL is appropriate.
// Both functions are tagged 'geo' so a single revalidateTag('geo') call
// flushes the entire layer (useful after an admin geo-data import).
const GEO_TTL = 86_400

// ── Provinces ──────────────────────────────────────────────────────────────
// Wrapped in a module-level cached function so the result is shared across
// all RSC renders in the same request AND across requests within the TTL.

const _getProvinces = unstable_cache(
  async (): Promise<Province[]> => {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('provinces')
        .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
        .order('name')

      if (error) throw error
      return (data ?? []) as Province[]
    } catch (err) {
      console.error('[geo] getProvinces failed:', err)
      return []
    }
  },
  ['geo', 'provinces'],
  { revalidate: GEO_TTL, tags: ['geo'] },
)

export function getProvinces(): Promise<Province[]> {
  return _getProvinces()
}

// ── Districts by province ──────────────────────────────────────────────────
// The provinceSlug argument is automatically appended to the keyParts by
// unstable_cache, so each slug gets its own distinct cache entry.
// Pattern: define the cached impl at module level, wrap in a named export
// that forwards the argument — this keeps the call site clean.

const _getDistrictsByProvince = unstable_cache(
  async (provinceSlug: string): Promise<District[]> => {
    try {
      const supabase = await createClient()

      // Resolve slug → id first; district table only stores province_id.
      const { data: province, error: provErr } = await supabase
        .from('provinces')
        .select('id')
        .eq('slug', provinceSlug)
        .maybeSingle()

      if (provErr) throw provErr
      if (!province) return []

      const { data, error } = await supabase
        .from('districts')
        .select('id, code, name, name_full, slug, province_id, type, lat, lng, created_at, updated_at')
        .eq('province_id', province.id)
        .order('name')

      if (error) throw error
      return (data ?? []) as District[]
    } catch (err) {
      console.error(`[geo] getDistrictsByProvince("${provinceSlug}") failed:`, err)
      return []
    }
  },
  ['geo', 'districts'],
  { revalidate: GEO_TTL, tags: ['geo'] },
)

export function getDistrictsByProvince(provinceSlug: string): Promise<District[]> {
  return _getDistrictsByProvince(provinceSlug)
}
