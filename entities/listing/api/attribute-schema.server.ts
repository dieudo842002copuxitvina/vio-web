// Server-only. Do NOT import in 'use client' components.

import { unstable_cache }          from 'next/cache'
import { createClient }            from '@/lib/supabase/server'
import type { ListingType }        from '../model/types'
import type { ListingAttributeSchema } from '../model/attribute-schema'

// ── getAttributeSchema ────────────────────────────────────────────────────────
// Fetches all attribute schemas for a listing type, ordered by display_order.
// Cached per listing_type for 1 hour — schemas change only via DB migrations,
// not at runtime. Revalidate with: revalidateTag('listing-attribute-schemas').

export async function getAttributeSchema(
  listingType: ListingType
): Promise<ListingAttributeSchema[]> {
  return unstable_cache(
    async () => {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('listing_attribute_schemas')
        .select('*')
        .eq('listing_type', listingType)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[getAttributeSchema]', error.message)
        return []
      }

      return (data ?? []) as ListingAttributeSchema[]
    },
    [`listing-attribute-schemas-${listingType}`],
    {
      tags:    ['listing-attribute-schemas'],
      revalidate: 3_600,  // 1 hour — schemas rarely change
    }
  )()
}

// ── getFilterableSchemas ──────────────────────────────────────────────────────
// Returns only the filterable schemas — used by filter UI builders.
// Cached separately so the filter panel can warm independently.

export async function getFilterableSchemas(
  listingType: ListingType
): Promise<ListingAttributeSchema[]> {
  const all = await getAttributeSchema(listingType)
  return all.filter(s => s.filterable)
}

// ── getSearchableSchemas ──────────────────────────────────────────────────────
// Returns only the searchable schemas — used by the search indexer.

export async function getSearchableSchemas(
  listingType: ListingType
): Promise<ListingAttributeSchema[]> {
  const all = await getAttributeSchema(listingType)
  return all.filter(s => s.searchable)
}
