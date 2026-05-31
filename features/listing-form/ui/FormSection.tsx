// Apple HIG grouped section — mirrors iOS Settings / form card style.
// Use for every logical group of fields in a listing form.

interface FormSectionProps {
  title:    string
  subtitle?: string
  children: React.ReactNode
  // Optional badge — e.g. "Bắt buộc" or "Tuỳ chọn"
  badge?:   string
}

export function FormSection({ title, subtitle, badge, children }: FormSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E]">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.08]">
        <div>
          <h2 className="text-[1rem] font-semibold leading-snug text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[0.75rem] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
            {badge}
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 px-5 py-5">{children}</div>
    </div>
  )
}

// ── FormDivider — subtle horizontal rule between sections ──────────────────────

export function FormDivider({ label }: { label?: string }) {
  if (!label) return <hr className="border-gray-100 dark:border-white/[0.06]" />

  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-gray-100 dark:border-white/[0.06]" />
      <span className="text-[0.75rem] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <hr className="flex-1 border-gray-100 dark:border-white/[0.06]" />
    </div>
  )
}

// ── FormField — label + input wrapper used inside FormSection ─────────────────

interface FormFieldProps {
  label:    string
  required?: boolean
  error?:   string
  hint?:    string
  children: React.ReactNode
}

export function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[0.8125rem] text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-[0.8125rem] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
