import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { ToastContainer } from './components/ui/ToastContainer'

export function App() {
  return (
    <ProtectedRoute>
      <AppShell />
      <ToastContainer />
    </ProtectedRoute>
  )
}
