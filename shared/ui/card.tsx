import { forwardRef } from 'react'
import { cn }         from './utils'

// ── Card ──────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift animation — useful for interactive/clickable cards */
  hoverable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ hoverable = false, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          // Surface
          'bg-white rounded-3xl overflow-hidden',
          // Shadow — apple-soft from @theme
          'shadow-apple-soft',
          // Border — subtle, low-opacity so it reads as texture not division
          'border border-gray-100/50',
          // Dark mode
          'dark:bg-[#1C1C1E] dark:border-white/[0.06]',
          // Optional hover lift (Apple springy feel)
          hoverable && [
            'transition-transform duration-300 cursor-pointer',
            'hover:scale-[1.02] active:scale-[0.99]',
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

// ── CardHeader ────────────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders a hairline separator below the header */
  divided?: boolean
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ divided = true, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-5',
          divided && 'border-b border-gray-100 dark:border-white/[0.06]',
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

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

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
// Bonus: top-divided footer for action rows (CTAs, pagination)

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4',
          'border-t border-gray-100 dark:border-white/[0.06]',
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

// ── Barrel export (convenience) ───────────────────────────────────────────────
// Usage: import { Card, CardHeader, CardContent, CardFooter } from '@/shared/ui/card'
