'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import Link        from 'next/link'
import { usePathname } from 'next/navigation'

// ── Nav data ──────────────────────────────────────────────────────────────────

const NAV = [
  {
    heading: 'Khám phá',
    links: [
      { label: 'Đất nông nghiệp', href: '/dat-nong-nghiep' },
      { label: 'Tỉnh thành',      href: '/tinh'             },
      { label: 'Bản đồ',          href: '/ban-do'           },
      { label: 'Doanh nghiệp',    href: '/doanh-nghiep'     },
    ],
  },
  {
    heading: 'Thành viên',
    links: [
      { label: 'Membership',      href: '/membership'             },
      { label: 'Dashboard',       href: '/dashboard'              },
      { label: 'Cài đặt',         href: '/dashboard/cai-dat'      },
    ],
  },
] as const

// ── MobileDrawer ──────────────────────────────────────────────────────────────

export interface MobileDrawerProps {
  isOpen:   boolean
  onClose:  () => void
  authSlot: ReactNode
}

export function MobileDrawer({ isOpen, onClose, authSlot }: MobileDrawerProps) {
  const pathname  = usePathname()
  const closeRef  = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  // Close on route change
  useEffect(() => {
    closeRef.current()
  }, [pathname])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] md:hidden',
          'transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Drawer panel */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
        className={[
          'fixed inset-y-0 right-0 z-[201] flex w-[min(320px,90vw)] flex-col',
          'bg-[var(--surface)]',
          'shadow-[-4px_0_32px_rgba(0,0,0,0.12)]',
          'md:hidden',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >

        {/* Header row */}
        <div className="flex h-14 shrink-0 items-center justify-between
                        border-b border-[var(--line)] px-5">
          <Link
            href="/"
            onClick={onClose}
            className="no-underline"
            aria-label="VIO AGRI — Trang chủ"
          >
            <span className="text-[1.125rem] font-black tracking-[-0.03em] text-vio-forest">
              VIO
            </span>
            <span className="ml-0.5 text-[0.65rem] font-bold tracking-[0.12em] text-[#86868b]">
              AGRI
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl
                       text-[var(--sea-ink)] transition-colors hover:bg-[var(--sand)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vio-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable nav body */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Điều hướng chính"
        >
          {NAV.map(section => (
            <div key={section.heading} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-bold uppercase
                            tracking-[0.1em] text-[var(--muted)]">
                {section.heading}
              </p>
              <ul className="m-0 list-none p-0">
                {section.links.map(link => {
                  const active =
                    pathname === link.href ||
                    pathname.startsWith(link.href + '/')
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'flex items-center rounded-xl px-3 py-2.5',
                          'text-[15px] font-medium no-underline transition-colors',
                          active
                            ? 'bg-vio-primary/[0.08] font-semibold text-vio-forest'
                            : 'text-[var(--sea-ink)] hover:bg-[var(--sand)]',
                        ].join(' ')}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer CTAs + auth */}
        <div className="shrink-0 border-t border-[var(--line)] px-4 py-4
                        pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Link
            href="/dashboard/tin-dang/moi"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-full
                       bg-vio-forest py-3 text-[15px] font-bold text-white
                       no-underline transition-opacity hover:opacity-90
                       active:scale-[0.98]"
          >
            Đăng tin miễn phí
          </Link>

          <div className="mt-3 flex items-center justify-center">
            {authSlot}
          </div>
        </div>

      </div>
    </>
  )
}
