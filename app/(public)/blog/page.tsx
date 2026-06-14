import type { Metadata }    from 'next'
import Link                  from 'next/link'
import { getPublishedBlogs } from '@/features/blog/api/blog.server'

export const metadata: Metadata = {
  title:       'Blog & Tin tức — VIO AGRI',
  description: 'Cập nhật kiến thức và tin tức mới nhất về thị trường đất nông nghiệp Việt Nam.',
  openGraph: {
    title:       'Blog & Tin tức — VIO AGRI',
    description: 'Kiến thức chuyên sâu về đất nông nghiệp, pháp lý và xu hướng thị trường.',
  },
}

export const revalidate = 60

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Blog card ─────────────────────────────────────────────────────────────────

function BlogCard({
  slug,
  title,
  excerpt,
  thumbnail_url,
  published_at,
  created_at,
  profiles,
}: {
  slug:          string
  title:         string
  excerpt:       string | null
  thumbnail_url: string | null
  published_at:  string | null
  created_at:    string
  profiles?:     { display_name: string | null } | null
}) {
  const date = fmtDate(published_at ?? created_at)

  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-gray-100
                 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] no-underline
                 transition-all duration-300
                 hover:border-gray-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        {thumbnail_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnail_url}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform
                       duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300">
              <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="m-0 line-clamp-2 text-[16px] font-bold leading-snug tracking-tight
                       text-gray-900 group-hover:text-vio-forest transition-colors">
          {title}
        </h2>

        {excerpt && (
          <p className="m-0 mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-gray-500 flex-1">
            {excerpt}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {profiles?.display_name && (
            <span className="text-[12px] font-semibold text-gray-400">
              {profiles.display_name}
            </span>
          )}
          <span className="ml-auto text-[12px] text-gray-400">{date}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyBlogList() {
  return (
    <div className="col-span-full flex flex-col items-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100"
           aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="m-0 text-[16px] font-semibold text-gray-700">
        Chưa có bài viết nào
      </p>
      <p className="m-0 mt-1.5 text-[14px] text-gray-400">
        Quay lại sớm để xem tin tức mới nhất từ VIO AGRI.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogListPage() {
  const { items: blogs, total } = await getPublishedBlogs({ limit: 21 })

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8 sm:py-20">

      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-vio-forest">
          Blog & Tin tức
        </p>
        <h1 className="text-[2.25rem] font-bold tracking-[-0.02em] text-gray-900 sm:text-[2.75rem]">
          Kiến thức nông nghiệp
        </h1>
        <p className="mx-auto mt-3 max-w-[480px] text-[16px] text-gray-500">
          Cập nhật xu hướng thị trường, kiến thức pháp lý và kinh nghiệm đầu tư đất nông nghiệp.
        </p>
      </div>

      {/* Article count */}
      {total > 0 && (
        <p className="mb-6 text-[13px] text-gray-400">
          {total} bài viết
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogs.length === 0 ? (
          <EmptyBlogList />
        ) : (
          blogs.map(blog => (
            <BlogCard
              key={blog.id}
              slug={blog.slug}
              title={blog.title}
              excerpt={blog.excerpt}
              thumbnail_url={blog.thumbnail_url}
              published_at={blog.published_at}
              created_at={blog.created_at}
              profiles={blog.profiles as { display_name: string | null } | null}
            />
          ))
        )}
      </div>

    </main>
  )
}
