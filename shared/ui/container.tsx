import { cn } from './utils'

// ── Container ─────────────────────────────────────────────────────────────────
// Unified layout wrapper — max-width + responsive horizontal padding.
// Use `narrow` for dashboard / form pages (1080px), default for marketing (1280px).

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  narrow?: boolean
}

export function Container({
  narrow = false,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-8',
        narrow ? 'max-w-[1080px]' : 'max-w-[1280px]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
