// Pure type-cast utility — no 'use server': function is synchronous and used
// inside .map() callbacks in Server Components where async is not viable.
import type { SEOFeedRow } from './seo-feeds.server'
import type { Listing }    from '@/entities/listing'

export function seoRowToListing(row: SEOFeedRow): Listing {
  return row as unknown as Listing
}
