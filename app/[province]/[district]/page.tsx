import { permanentRedirect } from 'next/navigation'

// Legacy route: /:province/:district was the district business-discovery hub.
// There is no canonical district page in the new architecture.
// Redirect to the province-level land page — closest canonical equivalent.
export default async function LegacyDistrictPage(
  { params }: { params: Promise<{ province: string; district: string }> },
) {
  const { province } = await params
  permanentRedirect(`/dat-nong-nghiep/${province}`)
}
