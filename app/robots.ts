import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Dashboard + seller pages
        '/dashboard',
        '/dang-tin',
        '/ho-so',
        '/quan-ly',
        '/admin',

        // Auth flows
        '/auth',
        '/login',
        '/dang-nhap',
        '/register',
        '/dang-ky',

        // API + internals
        '/api',
        '/_next',

        // Generic private namespace
        '/private',
        '/settings',
      ],
    },
    sitemap: 'https://violocal.vn/sitemap.xml',
  }
}
