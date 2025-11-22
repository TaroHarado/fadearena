import { TopNav } from '@/components/TopNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-terminal-bg">
      <TopNav />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

