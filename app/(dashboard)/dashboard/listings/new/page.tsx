import type { Metadata }    from 'next'
import { redirect }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { fetchProvinces }    from '@/features/search/api/land-search.server'
import { ListingWizard }     from './_components/ListingWizard'
import type { DraftListing } from './_components/ListingWizard'

export const metadata: Metadata = {
  title: 'Đăng tin mới — VIO AGRI',
  robots: { index: false, follow: false },
}

// ── Draft resume loader ────────────────────────────────────────────────────────
// Loads an existing listing row + its attribute_values and maps them back to
// the DraftListing shape so the wizard can pre-populate all fields.

async function loadDraftForResume(
  listingId: string,
  userId:    string,
): Promise<Partial<DraftListing> | null> {
  const supabase = await createClient()

  const [{ data: listing }, { data: attrs }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price_text, short_description, province_id, district_id, location_text, status')
      .eq('id', listingId)
      .eq('owner_id', userId)
      .in('status', ['draft', 'published'])
      .maybeSingle(),

    supabase
      .from('listing_attribute_values')
      .select('key, value_text')
      .eq('listing_id', listingId),
  ])

  if (!listing) return null

  // Convert attribute rows to a keyed map
  const attrMap: Record<string, string> = {}
  for (const row of (attrs ?? []) as { key: string; value_text: string | null }[]) {
    if (row.value_text) attrMap[row.key] = row.value_text
  }

  // Parse location_text back to parts (best-effort)
  const locationParts = (listing.location_text as string | null)?.split(', ') ?? []

  return {
    listingId:        listing.id as string,
    title:            (listing.title as string | null)             ?? '',
    price_text:       (listing.price_text as string | null)        ?? '',
    description:      (listing.short_description as string | null) ?? '',
    province_id:      (listing.province_id as number | null)       ?? null,
    district_id:      (listing.district_id as number | null)       ?? null,
    province_name:    locationParts[locationParts.length - 1]      ?? '',
    district_name:    locationParts[locationParts.length - 2]      ?? '',
    ward_name:        locationParts[0]                             ?? '',
    ward_id:          null,
    lat:              null,
    lng:              null,
    // Attributes
    land_type:        attrMap.land_type        ?? '',
    transaction_type: (attrMap.transaction_type as DraftListing['transaction_type']) || '',
    area_m2:          attrMap.area_m2          ?? '',
    legal_status:     attrMap.legal_status     ?? '',
    frontage:         attrMap.frontage         ?? '',
    road_access:      attrMap.road_access      ?? '',
    water_source:     attrMap.water_source     ?? '',
    electricity:      attrMap.electricity      ?? '',
    current_crops:    attrMap.current_crops    ?? '',
    planting_year:    attrMap.planting_year    ?? '',
    // Images cannot be restored (File objects are browser-only); wizard shows no images on resume
    images:           [],
    cover_index:      0,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap?next=/dashboard/listings/new')

  const params       = await searchParams
  const resumeId     = typeof params.resume === 'string' ? params.resume : null

  const [provinces, initialDraft] = await Promise.all([
    fetchProvinces(),
    resumeId ? loadDraftForResume(resumeId, user.id) : Promise.resolve(null),
  ])

  // If resume ID given but listing not found / not owned by user, redirect
  if (resumeId && !initialDraft) {
    redirect('/tin-dang-cua-toi')
  }

  return (
    <ListingWizard
      userId={user.id}
      provinces={provinces}
      initialDraft={initialDraft ?? undefined}
    />
  )
}
