import { permanentRedirect } from 'next/navigation'

// Legacy route: /:province was the business-discovery hub.
// Canonical is now /dat-nong-nghiep/:province.
// 308 permanent redirect — Googlebot will update its index within a few crawls.
// The destination page handles alias resolution and 404s for unknown slugs.
export default async function LegacyProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province } = await params
  permanentRedirect(`/dat-nong-nghiep/${province}`)
}
