import type { NextConfig } from 'next'

const nextConfig: NextConfig = {

  // ── Compression ─────────────────────────────────────────────────────────────
  compress: true,

  // ── Trailing slash ───────────────────────────────────────────────────────────
  // false = canonical URLs never end with /
  // Google treats /path and /path/ as separate URLs; keeping it false avoids
  // duplicate-content penalties without needing redirects for every route.
  trailingSlash: false,

  // ── Image optimisation ───────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Supabase Storage — project-specific bucket
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Supabase Storage CDN
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      // Lorem Picsum — dev placeholder images (remove before production)
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
    // Formats ordered by preference; AVIF compresses ~50 % better than WebP.
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images for 7 days at the CDN edge.
    minimumCacheTTL: 604_800,
  },

  // ── Security headers ─────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          // Enforce HTTPS for 1 year, include subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Minimal referrer info for privacy
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          // Disable browser features not used by the app
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      // Cache immutable static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // ── Redirects ────────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Vietnamese auth URLs → canonical English URL
      // 308 = permanent redirect (GET method preserved)
      {
        source:      '/dang-nhap',
        destination: '/login',
        permanent:   true,
      },
      {
        source:      '/dang-ky',
        destination: '/login',
        permanent:   true,
      },

      // ── Legacy business directory routes → canonical /doanh-nghiep/ ─────────
      // Index page
      {
        source:      '/ho-kinh-doanh',
        destination: '/doanh-nghiep',
        permanent:   true,
      },
      // Detail page — must come before the index rule's prefix match
      {
        source:      '/ho-kinh-doanh/:slug',
        destination: '/doanh-nghiep/:slug',
        permanent:   true,
      },

      // ── Legacy province / district pages → canonical /dat-nong-nghiep/ ─────
      // NOTE: /:province and /:province/:district dynamic routes are handled at
      // the page level (app/[province]/page.tsx) with permanentRedirect() rather
      // than here, because a next.config catch-all would fire before static
      // routes like /dashboard and /dat-nong-nghiep.
    ]
  },

}

export default nextConfig
