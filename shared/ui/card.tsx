import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Variant Map ───────────────────────────────────────────────────────────────

type CardVariant = 'default' | 'listing' | 'merchant' | 'province' | 'stat'

const VARIANT_BASE: Record<CardVariant, string> = {
  default:  'rounded-3xl shadow-apple-soft bg-[var(--surface)] dark:bg-[var(--surface)]',
  listing:  'rounded-4xl shadow-apple-card bg-[var(--surface)] dark:bg-[var(--surface)]',
  merchant: 'rounded-3xl shadow-apple-soft bg-[var(--surface)] dark:bg-[var(--surface)]',
  province: 'rounded-4xl overflow-hidden',
  stat:     'rounded-2xl shadow-apple-soft bg-[var(--surface)] dark:bg-[var(--surface)]',
}

const VARIANT_BORDER: Record<CardVariant, string> = {
  default:  'border border-[var(--line)]',
  listing:  '',
  merchant: 'border border-[var(--line)]',
  province: '',
  stat:     'border border-[var(--line)]',
}

// ── Card ──────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:  CardVariant
  /** Adds a hover lift animation — useful for interactive/clickable cards */
  hoverable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ variant = 'default', hoverable = false, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden',
          VARIANT_BASE[variant],
          VARIANT_BORDER[variant],
          hoverable && [
            'transition-all duration-300 cursor-pointer',
            variant === 'listing'
              ? 'hover:shadow-apple-hover hover:-translate-y-0.5'
              : 'hover:scale-[1.02] active:scale-[0.99]',
          ],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

// ── CardImage ─────────────────────────────────────────────────────────────────

type AspectRatio = '3/2' | '4/3' | 'square' | '16/9'

const ASPECT: Record<AspectRatio, string> = {
  '3/2':   'aspect-[3/2]',
  '4/3':   'aspect-[4/3]',
  'square':'aspect-square',
  '16/9':  'aspect-video',
}

export interface CardImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src?:         string | null
  alt?:         string
  aspectRatio?: AspectRatio
  placeholder?: React.ReactNode
}

export function CardImage({
  src,
  alt = '',
  aspectRatio = '3/2',
  placeholder,
  className,
  ...props
}: CardImageProps) {
  return (
    <div
      className={cn(
        ASPECT[aspectRatio],
        'relative w-full overflow-hidden bg-gray-100 dark:bg-[var(--sand)]',
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
          {placeholder ?? '🌾'}
        </div>
      )}
    </div>
  )
}

// ── CardHeader ────────────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  divided?: boolean
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ divided = true, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-5',
          divided && 'border-b border-[var(--line)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

CardHeader.displayName = 'CardHeader'

// ── CardContent ───────────────────────────────────────────────────────────────

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('p-6', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

CardContent.displayName = 'CardContent'

// ── CardFooter ────────────────────────────────────────────────────────────────

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4',
          'border-t border-[var(--line)]',
          'flex items-center gap-3',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

CardFooter.displayName = 'CardFooter'
