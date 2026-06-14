// UTM attribution builder for VIO AGRI distribution engine.
// All share URLs go through here so attribution is consistent.

export type UtmSource   = 'zalo' | 'facebook' | 'google' | 'direct' | 'email' | 'qr'
export type UtmMedium   = 'social' | 'cpc' | 'organic' | 'referral' | 'email' | 'qr'
export type UtmCampaign = 'listing_share' | 'province_share' | 'launch' | 'boost'

const MEDIUM_MAP: Record<UtmSource, UtmMedium> = {
  zalo:     'social',
  facebook: 'social',
  google:   'cpc',
  direct:   'referral',
  email:    'email',
  qr:       'qr',
}

export function buildUtmUrl(
  base:     string,
  source:   UtmSource,
  campaign: UtmCampaign,
  content?: string,
): string {
  const url = new URL(base, 'https://violocal.vn')
  url.searchParams.set('utm_source',   source)
  url.searchParams.set('utm_medium',   MEDIUM_MAP[source])
  url.searchParams.set('utm_campaign', campaign)
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}

export const ZALO_SHARE_URL = (url: string): string =>
  `https://zalo.me/share/v2/link?url=${encodeURIComponent(url)}`

export const FB_SHARE_URL = (url: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
