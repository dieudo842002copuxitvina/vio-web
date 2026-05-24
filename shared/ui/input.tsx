import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders a red error message below the input */
  error?: string
  /** Renders a label above the input */
  label?: string
  /** Hint text rendered to the right of the label */
  hint?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ error, label, hint, id, className, ...props }, ref) {
    return (
      <div className="flex w-full flex-col gap-1.5">

        {/* Label row */}
        {label && (
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={id}
              className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400"
            >
              {label}
            </label>
            {hint && (
              <span className="text-xs text-gray-400">{hint}</span>
            )}
          </div>
        )}

        {/* Input field
            text-base (16px) is intentional — iOS Safari auto-zooms on inputs
            smaller than 16px. Do NOT reduce this below text-base.             */}
        <input
          ref={ref}
          id={id}
          className={cn(
            // Sizing — 44px minimum tap target (Apple HIG)
            'h-11 w-full px-4',
            // Typography — must stay at 16px to prevent iOS Safari zoom
            'text-base text-gray-900 placeholder:text-gray-400',
            // Surface
            'bg-white/80 backdrop-blur-sm',
            // Border & shape
            'rounded-xl border border-gray-200',
            // Focus ring — matches vio-primary brand with low-opacity fill
            'outline-none transition-all duration-200',
            'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
            // Disabled
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Dark mode
            'dark:bg-[#2C2C2E] dark:text-white dark:border-white/[0.1]',
            'dark:placeholder:text-gray-500',
            'dark:focus:border-vio-primary-dark dark:focus:ring-vio-primary-dark/20',
            // Error state overrides border + ring colour
            error && [
              'border-red-400',
              'focus:border-red-400 focus:ring-red-400/20',
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
            className="flex items-center gap-1 text-sm text-red-500"
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
