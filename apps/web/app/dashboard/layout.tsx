import { TopNav } from '@/components/TopNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-pump-bg">
      <TopNav />
      <main>{children}</main>
    </div>
  )
}
