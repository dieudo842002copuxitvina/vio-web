import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type InputSize = 'default' | 'lg'

const SIZE: Record<InputSize, string> = {
  default: 'h-11',   /* 44px — Apple HIG minimum tap target */
  lg:      'h-13',   /* 52px — hero search bar */
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?:     string
  label?:     string
  hint?:      string
  inputSize?: InputSize
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { error, label, hint, id, className, inputSize = 'default', leftIcon, rightIcon, ...props },
    ref,
  ) {
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

        {/* Input wrapper — handles icon positioning */}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 text-[var(--muted)]">
              {leftIcon}
            </span>
          )}

          {/* Input field
              text-base (16px) is intentional — iOS Safari auto-zooms on inputs
              smaller than 16px. Do NOT reduce this below text-base.             */}
          <input
            ref={ref}
            id={id}
            className={cn(
              // Sizing — 44px minimum tap target (Apple HIG)
              SIZE[inputSize], 'w-full',
              leftIcon  ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              // Typography — must stay at 16px to prevent iOS Safari zoom
              'text-base text-[var(--sea-ink)] placeholder:text-[var(--muted)]',
              // Surface
              'bg-[var(--surface)]',
              // Border & shape
              'rounded-xl border border-[var(--line)]',
              // Focus ring — matches vio-primary brand with low-opacity fill
              'outline-none transition-all duration-200',
              'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Dark mode — uses :root CSS variables, resolved automatically
              'dark:placeholder:text-[var(--muted)]',
              'dark:focus:border-vio-primary-dark dark:focus:ring-vio-primary-dark/20',
              // Error state overrides border + ring colour
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

          {rightIcon && (
            <span className="pointer-events-none absolute right-3.5 text-[var(--muted)]">
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={id ? `${id}-error` : undefined}
            role="alert"
            className="flex items-center gap-1 text-sm text-[#FF3B30]"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14"
              fill="currentColor" aria-hidden="true"
            >
              <path
                fillRule="evenodd" clipRule="evenodd"
                d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 3a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 7 4Zm0 6.5a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z"
              />
            </svg>
            {error}
          </p>
        )}

      </div>
    )
  },
)

Input.displayName = 'Input'
