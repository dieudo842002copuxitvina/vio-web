import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?:  string
  label?:  string
  hint?:   string
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, label, hint, id, className, ...props }, ref) {
    return (
      <div className="flex w-full flex-col gap-1.5">

        {/* Label row */}
        {label && (
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={id}
              className="text-[0.8125rem] font-semibold text-[var(--sea-ink-soft)]"
            >
              {label}
            </label>
            {hint && (
              <span className="text-xs text-[var(--muted)]">{hint}</span>
            )}
          </div>
        )}

        {/* Textarea field
            text-base (16px) matches <Input> — prevents iOS Safari auto-zoom. */}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full min-h-[120px] resize-y',
            'px-4 py-3',
            'text-base text-[var(--sea-ink)] placeholder:text-[var(--muted)]',
            'bg-[var(--surface)]',
            'rounded-xl border border-[var(--line)]',
            'outline-none transition-all duration-200',
            'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:placeholder:text-[var(--muted)]',
            'dark:focus:border-vio-primary-dark dark:focus:ring-vio-primary-dark/20',
            error && [
              'border-[#FF3B30]',
              'focus:border-[#FF3B30] focus:ring-[#FF3B30]/20',
            ],
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />

        {/* Error message */}
        {error && (
          <p
            id={id ? `${id}-error` : undefined}
            role="alert"
            className="flex items-center gap-1 text-sm text-[#FF3B30]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd" clipRule="evenodd"
                d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 3a.75.75 0 0 1 .75.75v2.5a.75.75
                   0 0 1-1.5 0v-2.5A.75.75 0 0 1 7 4Zm0 6.5a.875.875 0 1 0 0-1.75.875.875
                   0 0 0 0 1.75Z"
              />
            </svg>
            {error}
          </p>
        )}

      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
