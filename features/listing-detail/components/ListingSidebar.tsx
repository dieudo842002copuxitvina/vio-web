// Server Component — sticky sidebar shell for desktop detail layouts.
// Usage: wrap <ListingContactCard> and other widgets inside this.
//
// Layout pattern:
//   <div className="grid lg:grid-cols-[1fr_320px] gap-8">
//     <main>...</main>
//     <ListingSidebar>
//       <ListingContactCard ... />
//       <ListingSchemaMarkup ... />
//     </ListingSidebar>
//   </div>

interface ListingSidebarProps {
  children:   React.ReactNode
  className?: string
}

export function ListingSidebar({ children, className = '' }: ListingSidebarProps) {
  return (
    <aside
      className={[
        // Stick to viewport top once scrolled past header (adjust top if nav height changes)
        'lg:sticky lg:top-20',
        'flex flex-col gap-4',
        // On mobile: renders below main content, no sticky
        'mt-8 lg:mt-0',
        className,
      ].join(' ')}
    >
      {children}
    </aside>
  )
}

// ── SidebarWidget — individual card inside the sidebar ────────────────────────

interface SidebarWidgetProps {
  title?:     string
  children:   React.ReactNode
  className?: string
}

export function SidebarWidget({ title, children, className = '' }: SidebarWidgetProps) {
  return (
    <div
      className={[
        'rounded-3xl border border-gray-100/60 bg-white p-5',
        'shadow-[0_2px_16px_rgb(0,0,0,0.06)]',
        'dark:border-white/[0.06] dark:bg-[#1C1C1E]',
        className,
      ].join(' ')}
    >
      {title && (
        <h3 className="mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
