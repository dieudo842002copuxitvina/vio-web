import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quản lý' }

export const revalidate = 0

export default function EntityManagementPage() {
  return (
    <main className="p-6 md:p-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Dashboard
        </p>
        <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
          Quản lý
        </h1>
      </header>
    </main>
  )
}
