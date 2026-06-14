'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

// ── Context ───────────────────────────────────────────────────────────────────

interface ShellCtx {
  isSearchOpen: boolean
  openSearch:   () => void
  closeSearch:  () => void
}

const ShellContext = createContext<ShellCtx>({
  isSearchOpen: false,
  openSearch:   () => {},
  closeSearch:  () => {},
})

export function useShell() {
  return useContext(ShellContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ShellProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Global keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ShellContext.Provider value={{
      isSearchOpen,
      openSearch:  () => setIsSearchOpen(true),
      closeSearch: () => setIsSearchOpen(false),
    }}>
      {children}
    </ShellContext.Provider>
  )
}
