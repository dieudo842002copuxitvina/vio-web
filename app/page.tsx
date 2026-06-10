import type { Metadata }         from 'next'
import { createClient,
         createCachedClient }    from '@/lib/supabase/server'
import { getActiveSubscription } from '@/features/billing/api/subscription.server'
import { JsonLd }                from '@/shared/seo/JsonLd'
import { websiteSchema }         from '@/lib/seo/schema'

// ── Layout chrome ─────────────────────────────────────────────────────────────
import { TopNav }       from './(public)/_components/TopNav'
import { BottomTabBar } from './(public)/_components/bottom-tab-bar'
import { Footer }       from './_components/Footer'

// ── Homepage sections ─────────────────────────────────────────────────────────
import { HeroSection }       from './_components/homepage/HeroSection'
import { TrustMetrics }      from './_components/homepage/TrustMetrics'
import { FeaturedListings }  from './_components/homepage/FeaturedListings'
import { LandCategories }    from './_components/homepage/LandCategories'
import { ProvinceGrid }      from './_components/homepage/ProvinceGrid'
import { MapPreview }        from './_components/homepage/MapPreview'
import { EcosystemSection }  from './_components/homepage/EcosystemSection'
import { MembershipSection } from './_components/homepage/MembershipSection'
import { WhyVioAgri }        from './_components/homepage/WhyVioAgri'
import { FinalCTA }          from './_components/homepage/FinalCTA'

// ── Config ────────────────────────────────────────────────────────────────────
// dynamic = per-request so the Pro membership CTA personalises correctly.
// Public data (listing count) is cached inside createCachedClient() independently.

export const dynamic = 'force-dynamic'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'VIO AGRI — Nền tảng Giao dịch Đất Nông nghiệp Việt Nam',
  description: 'Tìm mua và cho thuê đất nông nghiệp uy tín. Đất lúa, đất vườn, lâm nghiệp, mặt nước — đã xác minh pháp lý trên toàn quốc.',
  openGraph: {
    title:       'VIO AGRI — Đất Nông nghiệp Việt Nam',
    description: 'Nền tảng giao dịch đất nông nghiệp cao cấp. Hơn 1.200 lô đất đã xác minh trên 8 tỉnh thành.',
    type:        'website',
    locale:      'vi_VN',
    siteName:    'VIO AGRI',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'VIO AGRI — Đất Nông nghiệp Việt Nam' }],
  },
  alternates: { canonical: '/' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // ── 1. Public data (cached) — listing count for hero stat ─────────────────
  const supabase = createCachedClient()
  const { count: listingCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')

  // ── 2. Auth — personalise membership CTA (Pro vs non-Pro) ─────────────────
  let isPro = false
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      const sub = await getActiveSubscription(user.id)
      isPro = sub?.plan_id === 'pro' && sub?.status === 'active'
    }
  } catch {
    // Auth failure → default to non-Pro (no crash)
  }

  return (
    <>
      <JsonLd schema={websiteSchema()} />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100]
                   focus:top-4 focus:left-4 rounded-lg bg-vio-forest px-4 py-2
                   text-sm font-semibold text-white"
      >
        Bỏ qua điều hướng
      </a>

      <TopNav />

      <main id="main-content" tabIndex={-1} className="bg-[#FBFBFD]">

        {/* S1: Full-width hero — drone photo + search */}
        <HeroSection listingCount={listingCount ?? 0} />

        {/* S2: Trust metrics — 4 live stats, overlaps hero bottom */}
        <TrustMetrics listingCount={listingCount ?? 0} />

        {/* S3: Featured land listings from DB */}
        <FeaturedListings />

        {/* S4: 7 agricultural land categories */}
        <LandCategories />

        {/* S5: Province grid — 8 provinces */}
        <ProvinceGrid />

        {/* S6: Map preview — dark green section */}
        <MapPreview />

        {/* S7: Why VIO AGRI — 4 trust benefits */}
        <WhyVioAgri />

        {/* S8: Ecosystem — VIO AGRI → VIO LOCAL → VIO EXPORT */}
        <EcosystemSection />

        {/* S9: Membership — Free + Pro, personalised CTA */}
        <MembershipSection isPro={isPro} />

        {/* S10: Final CTA — dark bottom conversion */}
        <FinalCTA />

      </main>

      <Footer />
      <BottomTabBar />
    </>
  )
}
