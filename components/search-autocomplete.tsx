'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  type:     'storefront' | 'province'
  slug:     string
  name:     string
  subtitle: string | null
}

interface Props {
  placeholder?: string
  className?:   string
  compact?:     boolean
}

export function SearchAutocomplete({
  placeholder = 'Tìm tỉnh thành, hộ kinh doanh...',
  className,
  compact = false,
}: Props) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<SearchResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const { data } = await supabase.rpc('search_autocomplete', { query: q, limit: 8 })
      const rows = (data as SearchResult[]) ?? []
      setResults(rows)
      setOpen(rows.length > 0 || q.trim().length >= 2)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setActiveIdx(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(q), 300)
  }

  const navigate = useCallback((r: SearchResult) => {
    const href = r.type === 'storefront' ? `/ho-kinh-doanh/${r.slug}` : `/${r.slug}`
    setOpen(false)
    setQuery(r.name)
    router.push(href)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter') {
      if (activeIdx >= 0) { e.preventDefault(); navigate(results[activeIdx]) }
      else if (query.trim()) { e.preventDefault(); setOpen(false) }
    }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); inputRef.current?.blur() }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const inputH = compact ? 'h-9' : 'h-12'

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>

      {/* ── Input row ── */}
      <div className={`flex items-center gap-2.5 px-3.5 ${inputH} rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] focus-within:border-[#0071E3] dark:focus-within:border-[#409CFF] transition-colors duration-150`}>

        {loading ? (
          <svg
            className="shrink-0 text-[#0071E3] dark:text-[#409CFF] animate-spin"
            width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
          </svg>
        ) : (
          <svg
            className="shrink-0 text-gray-400"
            width="16" height="16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3-3" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Tìm kiếm"
          aria-autocomplete="list"
          aria-expanded={open}
          className={`flex-1 min-w-0 bg-transparent ${compact ? 'text-sm' : 'text-[0.9375rem]'} text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none [&::-webkit-search-cancel-button]:hidden`}
        />

        {query && (
          <button
            type="button"
            aria-label="Xóa tìm kiếm"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (results.length > 0 || (query.trim().length >= 2 && !loading)) && (
        <ul
          role="listbox"
          aria-label="Kết quả tìm kiếm"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl bg-white/90 dark:bg-[#1C1C1E]/95 shadow-[0_8px_32px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgb(0,0,0,0.4)] overflow-hidden py-1.5 list-none m-0 p-0"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400 text-center">
              Không tìm thấy &ldquo;<span className="text-gray-700 dark:text-gray-200">{query}</span>&rdquo;
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={`${r.type}-${r.slug}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); navigate(r) }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  i === activeIdx
                    ? 'bg-gray-100 dark:bg-white/[0.07]'
                    : 'hover:bg-gray-100 dark:hover:bg-white/[0.07]'
                }`}
              >
                <span className="text-base leading-none shrink-0" aria-hidden="true">
                  {r.type === 'storefront' ? '🏪' : '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</p>
                  {r.subtitle && (
                    <p className="m-0 text-xs text-gray-400 dark:text-gray-500 truncate">{r.subtitle}</p>
                  )}
                </div>
                <span className="ml-auto shrink-0 text-[0.625rem] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-white/[0.07] px-2 py-0.5 rounded-full">
                  {r.type === 'storefront' ? 'Hộ KD' : 'Tỉnh'}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
