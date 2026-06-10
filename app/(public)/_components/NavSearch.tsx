'use client'

import { useState }  from 'react'
import { useRouter }  from 'next/navigation'
import { Search }     from 'lucide-react'

export function NavSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/dat-nong-nghiep?q=${encodeURIComponent(q)}` : '/dat-nong-nghiep')
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 justify-center" role="search">
      <div
        className="flex w-full max-w-2xl items-center overflow-hidden rounded-full
                   bg-neutral-100 pl-4 pr-1 py-1
                   ring-1 ring-neutral-200
                   transition-all duration-200
                   focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2E7D32]/25"
      >
        <Search size={15} className="mr-2 shrink-0 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Tìm kiếm đất nông nghiệp, trang trại..."
          aria-label="Tìm kiếm"
          className="flex-1 bg-transparent text-[0.875rem] text-neutral-700
                     placeholder:text-neutral-400 outline-none [font-size:16px]"
        />
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                     bg-[#2E7D32] text-white transition-colors hover:bg-[#1A4D2E]"
        >
          <Search size={13} aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
