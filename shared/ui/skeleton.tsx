import { cn } from './utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean
}

export function Skeleton({ circle = false, className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700/60',
        circle ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  )
}
