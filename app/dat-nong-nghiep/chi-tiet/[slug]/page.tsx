// 308 Permanent Redirect — canonical listing URL is /dat/[slug]
// SEO: alternates.canonical in generateMetadata already signals the preferred URL;
// this runtime redirect ensures browsers and crawlers are forwarded.

import { permanentRedirect } from 'next/navigation'
import type { Metadata }     from 'next'
import { getListingDetail }  from '@/entities/listing/api/listing.server'

export const revalidate = 3600

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const result   = await getListingDetail(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { listing: l, geo, coverImage } = result
  const loc   = [geo.district?.name, geo.province?.name].filter(Boolean).join(', ')
  const title = `${l.title}${loc ? ` tại ${loc}` : ''}`
  const desc  = l.description ?? `${l.price_text ?? ''} ${loc ? `tại ${loc}` : ''}`.trim()

  return {
    title,
    description: desc,
    alternates:  { canonical: `/dat/${l.slug}` },
    openGraph: {
      title,
      description: desc,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [],
    },
  }
}

export default async function LandDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  permanentRedirect(`/dat/${slug}`)
}
