'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { updateLeadStatus } from '@/app/actions/lead-status'
import type { LeadStatus }  from '@/app/actions/lead-status'

const STATUS: Record<LeadStatus, { label: string; dot: string; chip: string }> = {
  new:         { label: 'Chưa xử lý',       dot: 'bg-orange-400', chip: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  negotiating: { label: 'Đang thương lượng', dot: 'bg-blue-400',   chip: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'         },
  closed:      { label: 'Đã chốt',           dot: 'bg-green-500',  chip: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'       },
}

interface Props {
  inquiryId:     string
  currentStatus: LeadStatus
}

export function LeadStatusDropdown({ inquiryId, currentStatus }: Props) {
  const [open, setOpen]           = useState(false)
  const [status, setStatus]       = useState<LeadStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function select(next: LeadStatus) {
    setOpen(false)
    if (next === status) return
    setStatus(next) // optimistic
    startTransition(() => updateLeadStatus(inquiryId, next))
  }

  const cfg = STATUS[status]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50 ${cfg.chip}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
        {cfg.label}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M1.5 3.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_8px_32px_rgb(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#2C2C2E]">
          {(Object.entries(STATUS) as [LeadStatus, typeof STATUS[LeadStatus]][]).map(([key, s]) => (
            <button
              key={key}
              type="button"
              onClick={() => select(key)}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05] ${key === status ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
              {s.label}
              {key === status && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto text-gray-900 dark:text-white" aria-hidden="true">
                  <path d="M2.5 7l3.5 3.5 5.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
