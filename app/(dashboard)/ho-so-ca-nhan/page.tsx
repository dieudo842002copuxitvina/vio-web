'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type GeoOption = { id: number; name: string }
type Toast = { type: 'success' | 'error'; message: string } | null

type UserRole = 'moi_gioi' | 'chu_dat' | 'hop_tac_xa' | 'trang_trai'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'moi_gioi',   label: 'Môi giới đất nông nghiệp' },
  { value: 'chu_dat',    label: 'Chủ đất'                  },
  { value: 'hop_tac_xa', label: 'Hợp tác xã'               },
  { value: 'trang_trai', label: 'Trang trại'                },
]

// ── Form styles ───────────────────────────────────────────────────────────────

const FIELD_CLS = [
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-4',
  'text-[15px] text-gray-900 placeholder:text-gray-300',
  'outline-none transition-all duration-150',
  'focus:border-vio-forest/40 focus:ring-2 focus:ring-vio-forest/10',
  'disabled:bg-gray-50 disabled:text-gray-400',
].join(' ')

const SELECT_CLS = [
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-4',
  'text-[15px] text-gray-900',
  'outline-none transition-all duration-150',
  'focus:border-vio-forest/40 focus:ring-2 focus:ring-vio-forest/10',
  'disabled:bg-gray-50 disabled:text-gray-400',
].join(' ')

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastBanner({ toast, onDismiss }: { toast: NonNullable<Toast>; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 4000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      role="alert"
      className={[
        'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
        'flex items-center gap-2.5 rounded-2xl px-5 py-3.5',
        'text-[13px] font-semibold shadow-xl',
        toast.type === 'success' ? 'bg-vio-forest text-white' : 'bg-red-500 text-white',
      ].join(' ')}
    >
      {toast.type === 'success' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {toast.message}
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-600">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
        {hint && <span className="ml-1.5 font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
      <div className="border-b border-gray-50 px-5 py-4">
        <p className="m-0 text-[15px] font-bold text-gray-900">{title}</p>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HoSoCaNhanPage() {
  const [fullName,    setFullName]    = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [provinceId,  setProvinceId]  = useState('')
  const [roles,       setRoles]       = useState<UserRole[]>([])
  const [provinces,   setProvinces]   = useState<GeoOption[]>([])
  const [isBusy,      setIsBusy]      = useState(false)
  const [isInit,      setIsInit]      = useState(true)
  const [toast,       setToast]       = useState<Toast>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  // Load current user data + provinces
  useEffect(() => {
    async function init() {
      const sb = createClient()

      const [{ data: { user } }, { data: provData }] = await Promise.all([
        sb.auth.getUser(),
        sb.from('provinces').select('id, name').order('name', { ascending: true }),
      ])

      if (provData) setProvinces(provData as GeoOption[])

      if (user) {
        const m = user.user_metadata ?? {}
        setFullName(m.full_name ?? '')
        setPhone(m.phone ?? '')
        setEmail(user.email ?? '')
        setProvinceId(m.province_id ? String(m.province_id) : '')
        setRoles((m.roles as UserRole[]) ?? [])
      }

      setIsInit(false)
    }
    init()
  }, [])

  function toggleRole(role: UserRole) {
    setRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsBusy(true)
    setToast(null)

    try {
      const sb = createClient()
      const { error } = await sb.auth.updateUser({
        data: {
          full_name:   fullName.trim() || null,
          phone:       phone.trim()    || null,
          province_id: provinceId ? Number(provinceId) : null,
          roles,
        },
      })

      if (error) throw error
      setToast({ type: 'success', message: 'Đã lưu hồ sơ!' })
    } catch (err) {
      setToast({ type: 'error', message: (err as Error).message })
    } finally {
      setIsBusy(false)
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (isInit) {
    return (
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-8 space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="mb-4 h-44 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* Header */}
      <div className="mb-7">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Dashboard
        </p>
        <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
          Hồ sơ cá nhân
        </h1>
      </div>

      {toast && <ToastBanner toast={toast} onDismiss={dismissToast} />}

      <form onSubmit={handleSubmit} noValidate className="max-w-[600px] space-y-4">

        {/* ── Thông tin cơ bản ── */}
        <SectionCard title="Thông tin cơ bản">
          <div className="space-y-4">

            <Field label="Họ và tên">
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                className={FIELD_CLS}
              />
            </Field>

            <Field label="Số điện thoại">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0912 345 678"
                autoComplete="tel"
                inputMode="tel"
                className={FIELD_CLS}
              />
            </Field>

            <Field label="Email" hint="Không thể thay đổi">
              <input
                type="email"
                value={email}
                disabled
                className={FIELD_CLS}
              />
            </Field>

            <Field label="Tỉnh thành">
              <select
                value={provinceId}
                onChange={e => setProvinceId(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">— Chọn tỉnh / thành phố —</option>
                {provinces.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </Field>

          </div>
        </SectionCard>

        {/* ── Vai trò ── */}
        <SectionCard title="Vai trò của bạn">
          <p className="m-0 mb-4 text-[13px] text-gray-400">
            Chọn một hoặc nhiều vai trò phù hợp.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ROLES.map(r => {
              const checked = roles.includes(r.value)
              return (
                <label
                  key={r.value}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3',
                    'transition-colors duration-150',
                    checked
                      ? 'border-vio-forest/30 bg-[#F0F7F1]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {/* Checkbox */}
                  <span
                    className={[
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      'transition-colors',
                      checked ? 'border-vio-forest bg-vio-forest' : 'border-gray-300 bg-white',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleRole(r.value)}
                    aria-label={r.label}
                  />
                  <span className={`text-[14px] font-medium ${checked ? 'text-vio-forest' : 'text-gray-700'}`}>
                    {r.label}
                  </span>
                </label>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isBusy}
          className={[
            'flex w-full items-center justify-center gap-2 rounded-full',
            'bg-vio-forest py-3.5 text-[15px] font-bold text-white',
            'transition-opacity hover:opacity-90 active:scale-[0.98]',
            'disabled:opacity-50',
          ].join(' ')}
        >
          {isBusy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </button>

      </form>
    </div>
  )
}
