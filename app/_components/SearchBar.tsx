'use client'
import { LandSearchAutocomplete } from '@/features/search/ui/land-search-autocomplete'

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export function SearchBar({
  placeholder = 'Tìm doanh nghiệp, đất đai, dịch vụ tại địa phương...',
  className,
}: SearchBarProps) {
  return (
    <div className={`w-full max-w-2xl${className ? ` ${className}` : ''}`}>
      <LandSearchAutocomplete placeholder={placeholder} className="w-full" />
    </div>
  )
}
