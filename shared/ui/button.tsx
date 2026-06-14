import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Variant & Size Maps ───────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost'
type Size    = 'sm' | 'default' | 'lg' | 'pill'

const VARIANT: Record<Variant, string> = {
  primary: [
    'bg-vio-primary text-white',
    'hover:bg-vio-forest-mid',
    'dark:bg-vio-primary-dark',
  ].join(' '),

  secondary: [
    'bg-[var(--surface)] text-[var(--sea-ink)]',
    'border border-[var(--line)]',
    'hover:bg-[var(--link-bg-hover)]',
    'dark:hover:bg-[var(--sand)]',
  ].join(' '),

  ghost: [
    'text-vio-blue bg-transparent',
    'hover:bg-vio-blue/[0.08] active:bg-vio-blue/[0.12]',
    'dark:text-[#409CFF]',
  ].join(' '),
}

const SIZE: Record<Size, string> = {
  sm:      'h-9  min-h-[36px] px-3.5 text-sm          rounded-xl  gap-1.5',
  default: 'h-11 min-h-[44px] px-4   text-[0.9375rem] rounded-xl  gap-2',
  lg:      'h-14 min-h-[56px] px-6   text-base        rounded-2xl gap-2.5',
  pill:    'h-12 min-h-[48px] px-7   text-[0.9375rem] rounded-full gap-2',
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: Size }) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <svg
      className={cn(dim, 'animate-spin shrink-0')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  isLoading?: boolean
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant   = 'primary',
      size      = 'default',
      isLoading = false,
      disabled,
      children,
      className,
      iconLeft,
      iconRight,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Layout
          'inline-flex items-center justify-center',
          'font-semibold whitespace-nowrap select-none',
          // Motion — Apple HIG: quick, spring-like press feedback
          'transition-all duration-200',
          'active:scale-[0.98]',
          // Disabled
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'disabled:active:scale-100 disabled:active:opacity-50',
          // Variant + size
          VARIANT[variant],
          SIZE[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size={size} />}
        {!isLoading && iconLeft}
        {children}
        {iconRight}
      </button>
    )
  },
)

Button.displayName = 'Button'
