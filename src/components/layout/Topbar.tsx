import { useLocation } from 'react-router-dom'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cms':       'Consultas de Materiais',
  '/cms/new':   'Nova Consulta',
  '/admin':     'Administração',
  '/profile':   'Perfil',
}

function getTitle(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/cms/')) return 'Detalhe da CM'
  return 'Fluxo CM'
}

export function Topbar() {
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <div className="topbar-container">
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationDropdown />
      </div>
    </div>
  )
}
