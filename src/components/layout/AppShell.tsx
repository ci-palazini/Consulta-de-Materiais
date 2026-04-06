import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export function AppShell() {
  useRealtimeSync()

  return (
    <div className="container-shell">
      <Sidebar />
      <div className="main-container">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
