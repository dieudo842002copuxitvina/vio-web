'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BuyerLocation {
  lat: number
  lng: number
}

export interface DealerMatch {
  business_id:   string
  business_name: string
  phone:         string | null
  distance_m:    number
}

// ── routeOrderToNearestDealer ─────────────────────────────────────────────────
//
// Finds the nearest verified VIO partner dealer that can fulfil an order.
//
// Strategy:
//   1. Query storefronts where is_verified = true (marks official VIO dealers)
//   2. Use PostGIS ST_Distance to rank by proximity to the buyer's coordinates
//   3. Optionally filter by product_type if the table carries a specialisation column
//   4. Return the closest match (or null if no dealer exists in the region)
//
// This runs entirely server-side — coordinates and auth logic never touch the browser.

export async function routeOrderToNearestDealer(
  buyerLocation: BuyerLocation,
  productType?: string,
): Promise<DealerMatch | null> {
  const supabase = await createClient()

  // ST_Distance expects (geography, geography) — cast the point literal to geography.
  // The RPC receives the buyer point and returns rows ordered by distance ascending.
  const { data, error } = await supabase.rpc('find_nearest_dealer', {
    buyer_lat:    buyerLocation.lat,
    buyer_lng:    buyerLocation.lng,
    product_type: productType ?? null,
    result_limit: 1,
  })

  if (error) {
    console.error('[O2O routing] find_nearest_dealer RPC error:', error.message)
    return null
  }

  if (!data || (data as unknown[]).length === 0) return null

  const row = (data as DealerMatch[])[0]
  return row
}

// ── SQL for the supporting PostgreSQL function ────────────────────────────────
//
// Run once in Supabase SQL editor to create the backing RPC:
//
// CREATE OR REPLACE FUNCTION find_nearest_dealer(
//   buyer_lat    double precision,
//   buyer_lng    double precision,
//   product_type text    DEFAULT NULL,
//   result_limit integer DEFAULT 5
// )
// RETURNS TABLE (
//   business_id   uuid,
//   business_name text,
//   phone         text,
//   distance_m    double precision
// )
// LANGUAGE sql STABLE SECURITY DEFINER AS $$
//   SELECT
//     s.id                                                    AS business_id,
//     s.business_name,
//     s.phone,
//     ST_Distance(
//       s.location::geography,
//       ST_MakePoint(buyer_lng, buyer_lat)::geography
//     )                                                       AS distance_m
//   FROM storefronts s
//   WHERE
//     s.is_verified = true
//     AND s.is_public = true
//     AND s.location IS NOT NULL
//     -- Optional product type filter (requires a specialisations text[] column)
//     AND (product_type IS NULL OR product_type = ANY(COALESCE(s.specialisations, '{}'::text[])))
//   ORDER BY distance_m ASC
//   LIMIT result_limit;
// $$;
