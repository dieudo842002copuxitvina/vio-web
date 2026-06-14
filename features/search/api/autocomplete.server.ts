import { unstable_cache }    from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'
import { normalizeVi }     from '@/entities/search/model/normalize'
import type { AutocompleteHit } from '@/entities/search/types'

// ── searchLandAutocomplete ────────────────────────────────────────────────────
// Calls autocomplete_listings() RPC with p_type = 'land'.
// Results are cached 10 s per (qNorm, provinceId, limit) — safe for SSR since
// unstable_cache() runs only on the server and keying on the normalised query
// means a user's raw casing/accent variation never escapes to the cache key.

const _cachedLandAutocomplete = unstable_cache(
  async (
    qNorm:      string,
    provinceId: number | null,
    limit:      number,
  ): Promise<AutocompleteHit[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase.rpc('autocomplete_listings', {
      q:          qNorm,
      p_type:     'land',
      p_province: provinceId,
      p_limit:    limit,
    })
    if (error) {
      console.error('[searchLandAutocomplete]', error.message)
      return []
    }
    return (data ?? []) as AutocompleteHit[]
  },
  ['autocomplete', 'land'],
  { revalidate: 10, tags: ['listings'] },
)

export async function searchLandAutocomplete(
  q:          string,
  provinceId?: number,
  limit = 6,
): Promise<AutocompleteHit[]> {
  const qNorm = normalizeVi(q.trim())
  if (qNorm.length < 2) return []
  return _cachedLandAutocomplete(qNorm, provinceId ?? null, limit)
}

// ── searchMultiEntityAutocomplete ─────────────────────────────────────────────
// Calls search_autocomplete() RPC — storefronts + provinces in one round-trip.
// Cache key includes limit so a change from 8 → 10 never serves a short list.

interface GlobalAutocompleteHit {
  type:     'storefront' | 'province'
  slug:     string
  name:     string
  subtitle: string | null
}

const _cachedMultiEntityAutocomplete = unstable_cache(
  async (
    qNorm: string,
    limit: number,
  ): Promise<GlobalAutocompleteHit[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase.rpc('search_autocomplete', {
      query:        qNorm,
      result_limit: limit,
    })
    if (error) {
      console.error('[searchMultiEntityAutocomplete]', error.message)
      return []
    }
    return (data ?? []) as GlobalAutocompleteHit[]
  },
  ['autocomplete', 'multi'],
  { revalidate: 10, tags: ['listings'] },
)

export async function searchMultiEntityAutocomplete(
  q:     string,
  limit = 8,
): Promise<GlobalAutocompleteHit[]> {
  const qNorm = normalizeVi(q.trim())
  if (qNorm.length < 2) return []
  return _cachedMultiEntityAutocomplete(qNorm, limit)
}
