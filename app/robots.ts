import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // ── Seller dashboard & listing management ─────────────────────────
        '/dashboard',
        '/dang-tin',
        '/dang-tin-dat',
        '/tin-dang-cua-toi',
        '/quan-ly',
        '/quan-ly-leads',
        '/quan-ly-lich-hen',
        '/phan-tich',
        '/admin',

        // ── User-private pages (route group app/(dashboard)/) ─────────────
        '/tin-da-luu',
        '/tim-kiem-da-luu',
        '/ho-so-ca-nhan',
        '/nang-cap',

        // ── Auth flows ────────────────────────────────────────────────────
        '/auth',
        '/login',
        '/dang-nhap',
        '/register',
        '/dang-ky',

        // ── Legacy profile route ──────────────────────────────────────────
        '/ho-so',

        // ── API + internals ───────────────────────────────────────────────
        '/api',
        '/_next',

        // ── Generic private namespace ─────────────────────────────────────
        '/private',
        '/settings',
      ],
    },
    sitemap: 'https://violocal.vn/sitemap.xml',
  }
}
