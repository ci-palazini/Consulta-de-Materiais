import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'member' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: 13, color: '#64748b' }}>Carregando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Acesso Negado</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Você não tem permissão para acessar esta página</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
