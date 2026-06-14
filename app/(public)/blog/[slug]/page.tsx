import type { Metadata }   from 'next'
import Link                 from 'next/link'
import { notFound }         from 'next/navigation'
import { getBlogBySlug }    from '@/features/blog/api/blog.server'

export const revalidate = 60

// ── generateMetadata ──────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)
  if (!blog) return { title: 'Bài viết không tồn tại — VIO AGRI' }

  const description = blog.excerpt ?? `Đọc bài viết "${blog.title}" trên VIO AGRI Blog.`

  return {
    title:       `${blog.title} — VIO AGRI Blog`,
    description,
    openGraph: {
      title:       blog.title,
      description,
      type:        'article',
      publishedTime: blog.published_at ?? undefined,
      images:      blog.thumbnail_url ? [{ url: blog.thumbnail_url, alt: blog.title }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title:       blog.title,
      description,
      images:      blog.thumbnail_url ? [blog.thumbnail_url] : [],
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)
  if (!blog) notFound()

  const author = (blog.profiles as { display_name?: string | null } | null)?.display_name
  const date   = fmtDate(blog.published_at ?? blog.created_at)

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-[13px] text-gray-400"
           aria-label="Breadcrumb">
        <Link href="/blog" className="no-underline hover:text-gray-700">Blog</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="line-clamp-1 text-gray-500">{blog.title}</span>
      </nav>

      <article className="mx-auto max-w-3xl">

        {/* Thumbnail */}
        {blog.thumbnail_url && (
          <div className="mb-8 overflow-hidden rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.thumbnail_url}
              alt={blog.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-vio-forest">
            Blog & Tin tức
          </p>

          <h1 className="m-0 text-[2rem] font-bold leading-tight tracking-[-0.02em]
                         text-gray-900 sm:text-[2.5rem]">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="m-0 mt-4 text-[17px] leading-relaxed text-gray-500">
              {blog.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t
                          border-gray-100 pt-5">
            {author && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vio-forest/10">
                  <span className="text-[13px] font-bold text-vio-forest">
                    {author.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-gray-700">{author}</span>
              </div>
            )}
            {date && (
              <time dateTime={blog.published_at ?? blog.created_at}
                    className="text-[13px] text-gray-400">
                {date}
              </time>
            )}
          </div>
        </header>

        {/* Content — uses @tailwindcss/typography for rich rendering */}
        {blog.content ? (
          <div
            className="prose prose-lg mx-auto
                       prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
                       prose-p:text-gray-700 prose-p:leading-relaxed
                       prose-a:text-vio-forest prose-a:no-underline hover:prose-a:underline
                       prose-img:rounded-2xl prose-img:shadow-sm
                       prose-blockquote:border-l-vio-forest prose-blockquote:text-gray-600
                       prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:text-[0.875em]
                       prose-pre:rounded-2xl prose-pre:bg-gray-900
                       prose-strong:text-gray-900
                       max-w-none"
            /* Admin-authored content only — sanitize with DOMPurify before rendering user-generated content */
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        ) : (
          <p className="text-[15px] text-gray-400 italic">Bài viết chưa có nội dung.</p>
        )}

        {/* Footer */}
        <footer className="mt-14 border-t border-gray-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/blog"
              className="flex items-center gap-2 text-[14px] font-semibold text-gray-500
                         no-underline hover:text-gray-900"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Tất cả bài viết
            </Link>
            <Link
              href="/dat-nong-nghiep"
              className="rounded-full bg-vio-forest px-4 py-2 text-[13px] font-bold
                         text-white no-underline hover:opacity-90"
            >
              Khám phá đất ngay →
            </Link>
          </div>
        </footer>

      </article>
    </main>
  )
}
