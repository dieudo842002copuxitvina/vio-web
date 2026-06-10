import type { Storefront, MerchantTrust } from './storefront.types'

export type MockStorefrontData = Storefront & MerchantTrust

export function getMockStorefront(slug: string): MockStorefrontData | null {
  if (!slug) return null
  return {
    id:             'sf_kubota_binhduong_001',
    merchant_id:    'mer_nguyen_van_nam_001',
    slug,
    business_name:  'Đại Lý Máy Nông Nghiệp Kubota Bình Dương',
    avatar_url:     'https://placehold.co/120x120/16a34a/ffffff?text=KBD',
    banner_url:     'https://placehold.co/1200x400/15803d/ffffff?text=Kubota+Binh+Duong',
    about_html:     '<p>Chúng tôi là đại lý ủy quyền chính thức của <strong>Kubota</strong> tại Bình Dương, chuyên cung cấp máy kéo, máy gặt đập liên hợp, máy cấy lúa và các thiết bị nông nghiệp hiện đại.</p><p>Với hơn 12 năm kinh nghiệm, chúng tôi cam kết mang đến sản phẩm chính hãng, dịch vụ bảo hành tận tâm và hỗ trợ kỹ thuật 24/7.</p>',
    is_verified:    true,
    social_links: {
      zalo:     '0909123456',
      facebook: 'https://facebook.com/kubota.binhduong',
      website:  'https://kubotabinhduong.vn',
    },
    contact_phone: '0909 123 456',
    trust_score:           92,
    active_listings_count: 47,
    response_rate:         96,
    joined_date:           '2020-03-15',
  }
}
