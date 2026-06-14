// Server-safe homepage listing fetcher.
// Import from Server Components only — never from 'use client' files.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Listing }        from '@/entities/listing/model/types'

// ── HomepageListing ───────────────────────────────────────────────────────────
// A focused Pick of the authoritative Listing type.
// Stays in sync automatically — no duplicated field definitions.
//
// IMPORTANT FIELD NOTES:
//   cover_url   — the image column. There is no "image_url" column in the DB.
//   type        — returned as .type in JS because of the "listing_type:type"
//                 select alias below. The actual DB column is `listing_type`.

export type HomepageListing = Pick<
  Listing,
  | 'id'
  | 'type'           // aliased from DB column listing_type
  | 'slug'
  | 'title'
  | 'cover_url'
  | 'price_text'
  | 'location_text'
  | 'is_featured'
  | 'is_verified'
  | 'created_at'
>

// ── Column selector ───────────────────────────────────────────────────────────
// ONLY columns that exist in the DB are listed here.
// "listing_type:type" — renames the DB column listing_type → JS key .type.
// NEVER use .eq('type', value) in Postgres filters — always .eq('listing_type', value).

const COLS = [
  'id',
  'listing_type:type',
  'slug',
  'title',
  'cover_url',
  'price_text',
  'location_text',
  'is_featured',
  'is_verified',
  'created_at',
].join(', ')

// ── getHomepageListings ───────────────────────────────────────────────────────
// Fetches the 8 most recent approved public listings (featured-first).
// All errors are caught and logged — the function always returns an array,
// never throws, so a DB outage cannot crash the homepage.

export async function getHomepageListings(
  supabase: SupabaseClient,
): Promise<HomepageListing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(COLS)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('[getHomepageListings]', error.message)
      return []
    }

    return (data ?? []) as unknown as HomepageListing[]
  } catch (err) {
    console.error('[getHomepageListings] unexpected:', err)
    return []
  }
}
