'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from 'react'
import Image                  from 'next/image'
import Link                   from 'next/link'
import { useRouter }          from 'next/navigation'
import { universalSearch }    from '../api/search.server'
import { logSearch }          from '../api/search.server'
import type {
  SearchResponse,
  SearchHit,
  SearchEntityType,
} from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 280

const CATEGORY_SHORTCUTS = [
  { label: 'Đất nông nghiệp', href: '/dat-nong-nghiep', icon: '🌾' },
  { label: 'Sản phẩm',        href: '/san-pham',         icon: '📦' },
  { label: 'Dịch vụ',         href: '/dich-vu',           icon: '🔧' },
  { label: 'Doanh nghiệp',    href: '/doanh-nghiep',      icon: '🏪' },
]

const RECENT_KEY = 'vio_recent_searches'
const MAX_RECENT = 6

// ── Local storage helpers ─────────────────────────────────────────────────────

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function saveRecent(query: string) {
  const prev = getRecent().filter(q => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)))
}

// ── Entity type icons ─────────────────────────────────────────────────────────

const TYPE_ICON: Record<SearchEntityType, string> = {
  land_listing: '🌾',
  product:      '📦',
  service:      '🔧',
  storefront:   '🏪',
  category:     '🗂',
  province:     '📍',
  district:     '📍',
}

// ── Hit row ───────────────────────────────────────────────────────────────────

function HitRow({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
  return (
    <Link
      href={hit.href}
      onClick={onSelect}
      className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5 no-underline transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-white/[0.05]"
    >
      {hit.image_url ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          <Image src={hit.image_url} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
          <span aria-hidden="true">{TYPE_ICON[hit.type] ?? '📋'}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[0.9375rem] font-semibold text-gray-900 dark:text-white">
          {hit.title}
        </p>
        {hit.subtitle && (
          <p className="m-0 mt-0.5 truncate text-[0.8125rem] text-gray-500 dark:text-gray-400">
            {hit.subtitle}
          </p>
        )}
      </div>
      {hit.badge && (
        <span className="shrink-0 rounded-full bg-[#34C759]/10 px-2 py-0.5 text-[0.6875rem] font-bold text-[#34C759]">
          {hit.badge}
        </span>
      )}
    </Link>
  )
}

// ── SearchOverlay ─────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  isOpen:   boolean
  onClose:  () => void
  trending?: string[]
}

export function SearchOverlay({ isOpen, onClose, trending = [] }: SearchOverlayProps) {
  const router             = useRouter()
  const inputRef           = useRef<HTMLInputElement>(null)
  const abortRef           = useRef<AbortController | null>(null)
  const debounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [recent,  setRecent]  = useState<string[]>([])
  const [, startTransition]   = useTransition()

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => setRecent(getRecent()))
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      void Promise.resolve().then(() => { setQuery(''); setResults(null) })
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)

    startTransition(async () => {
      try {
        const response = await universalSearch(q, { limit: 4 })
        setResults(response)
        // Fire-and-forget analytics
        logSearch(q, response.total)
      } catch {
        // aborted or network error — silently swallow
      } finally {
        setLoading(false)
      }
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(q), DEBOUNCE_MS)
  }

  function handleSelect() {
    if (query.trim()) saveRecent(query.trim())
    onClose()
  }

  function handleRecentClick(q: string) {
    setQuery(q)
    performSearch(q)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    saveRecent(query.trim())
    router.push(`/tim-kiem?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  if (!isOpen) return null

  const showEmpty    = query.length < 2
  const hasResults   = results && results.total > 0
  const noResults    = results && results.total === 0 && !isLoading

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Overlay panel */}
      <div
        role="search"
        className={[
          'fixed left-0 right-0 top-0 z-50',
          'flex max-h-[92dvh] flex-col',
          'bg-white/95 backdrop-blur-xl dark:bg-[#1C1C1E]/95',
          'shadow-2xl',
          // Desktop: constrained centered dialog
          'md:left-1/2 md:top-20 md:right-auto md:-translate-x-1/2',
          'md:w-full md:max-w-2xl md:rounded-3xl',
          'md:border md:border-gray-200/50 dark:md:border-white/[0.08]',
        ].join(' ')}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Search input row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          {/* Search icon */}
          <svg
            className="h-5 w-5 shrink-0 text-gray-400"
            fill="none" viewBox="0 0 20 20" stroke="currentColor"
            strokeWidth="2" aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.75" />
            <path d="M13 13l3.5 3.5" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Tìm đất, sản phẩm, dịch vụ..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Tìm kiếm VIO LOCAL"
            className={[
              'flex-1 bg-transparent text-base text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'outline-none',
            ].join(' ')}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-white/[0.12]"
              aria-label="Xóa"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {/* Close (mobile) */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[0.9375rem] font-semibold text-[#0071E3] dark:text-[#409CFF]"
          >
            Hủy
          </button>
        </form>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3">

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && hasResults && results.groups.map(group => (
            <div key={group.type} className="mb-4">
              <p className="mb-1.5 px-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                {group.label}
              </p>
              {group.hits.map(hit => (
                <HitRow key={`${hit.type}-${hit.id}`} hit={hit} onSelect={handleSelect} />
              ))}
            </div>
          ))}

          {/* No results */}
          {noResults && (
            <div className="py-10 text-center">
              <p className="m-0 text-3xl" aria-hidden="true">🔍</p>
              <p className="m-0 mt-3 text-[0.9375rem] font-semibold text-gray-900 dark:text-white">
                Không tìm thấy kết quả
              </p>
              <p className="m-0 mt-1 text-[0.8125rem] text-gray-500">
                Thử từ khóa khác hoặc tìm kiếm gần hơn
              </p>
            </div>
          )}

          {/* Empty state — recent + shortcuts + trending */}
          {showEmpty && !isLoading && (
            <div className="space-y-6">

              {/* Category shortcuts */}
              <div>
                <p className="mb-2.5 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                  Danh mục
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_SHORTCUTS.map(c => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onClose}
                      className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-4 py-3 no-underline transition-colors hover:bg-gray-100 dark:bg-[#2C2C2E] dark:hover:bg-white/[0.1]"
                    >
                      <span className="text-xl" aria-hidden="true">{c.icon}</span>
                      <span className="text-[0.875rem] font-semibold text-gray-800 dark:text-gray-200">{c.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent searches */}
              {recent.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Tìm kiếm gần đây
                    </p>
                    <button
                      type="button"
                      onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]) }}
                      className="text-[0.8125rem] text-gray-400 hover:text-gray-600"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {recent.map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleRecentClick(q)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                      >
                        <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                          <path d="M8 4v4l2.5 2.5M14.5 8A6.5 6.5 0 1 1 1.5 8a6.5 6.5 0 0 1 13 0Z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[0.9375rem] text-gray-700 dark:text-gray-300">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              {trending.length > 0 && (
                <div>
                  <p className="mb-2.5 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                    🔥 Xu hướng tìm kiếm
                  </p>
                  <div className="flex flex-wrap gap-2 px-1">
                    {trending.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleRecentClick(t)}
                        className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[0.875rem] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.1] dark:bg-[#2C2C2E] dark:text-gray-300"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </>
  )
}
