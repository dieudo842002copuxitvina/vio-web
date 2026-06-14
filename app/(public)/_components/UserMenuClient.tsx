'use client'

import { useState, useRef, useEffect } from 'react'
import Link        from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:    string
  email: string
  name:  string
}

export interface UserMenuClientProps {
  user:  AuthUser | null
  isPro: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(user: AuthUser): string {
  const src = user.name || user.email
  return src.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function menuItems(isPro: boolean) {
  return [
    { label: 'Dashboard',                              href: '/dashboard'              },
    { label: 'Tin đã đăng',                            href: '/dashboard/tin-dang'     },
    { label: isPro ? 'Quản lý gói' : 'Nâng cấp Pro',  href: isPro ? '/dashboard/nang-cap' : '/membership' },
    { label: 'Cài đặt tài khoản',                      href: '/dashboard/cai-dat'      },
  ] as const
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserMenuClient({ user, isPro }: UserMenuClientProps) {
  const [open, setOpen] = useState(false)
  const wrapRef         = useRef<HTMLDivElement>(null)
  const router          = useRouter()

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onMouse(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Link
        href="/dang-nhap"
        className="whitespace-nowrap rounded-full border border-[var(--chip-line)]
                   px-4 py-1.5 text-[13px] font-semibold text-[var(--sea-ink)]
                   no-underline transition-colors hover:bg-[var(--link-bg-hover)]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vio-primary"
      >
        Đăng nhập
      </Link>
    )
  }

  // ── Logged in ─────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="relative">

      {/* Avatar trigger */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        aria-label="Tài khoản của tôi"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 select-none items-center justify-center rounded-full
                   bg-vio-forest text-[13px] font-bold text-white
                   ring-2 ring-transparent transition-all
                   hover:ring-vio-primary/40
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vio-primary"
      >
        {initials(user)}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden
                     rounded-2xl border border-[var(--line)] bg-[var(--surface)]
                     shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                     animate-[rise-in_150ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          {/* Identity */}
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="truncate text-[13px] font-semibold text-[var(--sea-ink)]">
              {user.name || 'Người dùng'}
            </p>
            <p className="truncate text-[11px] text-[var(--muted)]">{user.email}</p>
            {isPro && (
              <span className="mt-1.5 inline-flex items-center rounded-full
                               border border-vio-primary/20 bg-vio-primary/10
                               px-2 py-0.5 text-[11px] font-bold text-vio-forest">
                Pro
              </span>
            )}
          </div>

          {/* Links */}
          <div className="p-1.5">
            {menuItems(isPro).map(item => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center rounded-xl px-3 py-2.5 text-[14px]
                           text-[var(--sea-ink)] no-underline
                           transition-colors hover:bg-[var(--sand)]
                           focus-visible:bg-[var(--sand)] focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-[var(--line)] p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center rounded-xl px-3 py-2.5
                         text-[14px] text-[#FF3B30]
                         transition-colors hover:bg-[#FF3B30]/[0.06]"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
