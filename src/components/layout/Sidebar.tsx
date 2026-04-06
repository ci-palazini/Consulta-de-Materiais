import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, FileText, Settings, LogOut, Menu, X, Plus, User } from 'lucide-react'
import { useState, useCallback } from 'react'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cms',       label: 'Consultas',  icon: FileText },
]
const ADMIN_ITEM   = { path: '/admin',   label: 'Administração', icon: Settings }
const PROFILE_ITEM = { path: '/profile', label: 'Meu Perfil',    icon: User }

const S = {
  sidebar: {
    width: 240,
    bg: '#0f172a',
  } as const,
}

export function Sidebar() {
  const { profile, session, signOut } = useAuth()
  const location = useLocation()

  const handleLogout = useCallback(() => {
    signOut()
  }, [signOut])
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    ...NAV,
    ...(profile?.role === 'admin' ? [ADMIN_ITEM] : []),
    PROFILE_ITEM,
  ]

  const isVendas = profile?.department?.slug === 'vendas'

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === path
      : location.pathname.startsWith(path)

  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'Usuário'
  const initials    = profile?.avatar_initials || displayName[0]?.toUpperCase() || '?'

  const sidebarContent = (
    <aside style={{
      width: S.sidebar.width,
      backgroundColor: S.sidebar.bg,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0 1.25rem',
        height: '3.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
          color: '#fff',
          flexShrink: 0,
        }}>
          CM
        </div>
        <div>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>Fluxo CM</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.2 }}>Consulta de Materiais</p>
        </div>
      </div>

      {/* Nova CM button (only for Vendas) */}
      {isVendas && (
        <div style={{ padding: '0 0.625rem', marginTop: '0.5rem' }}>
          <Link
            to="/cms/new"
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 8,
              backgroundColor: '#16a34a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#16a34a'}
          >
            <Plus size={16} />
            Nova CM
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', overflowY: 'auto' }}>
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                backgroundColor: active ? '#2563eb' : 'transparent',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', flexShrink: 0 }}>
        {profile?.department && (
          <div style={{ padding: '0.25rem 0.75rem', marginBottom: 4 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 2 }}>
              Departamento
            </p>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.department.name}
            </p>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              flex: 1,
              minWidth: 0,
              textDecoration: 'none',
              borderRadius: 6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName.split(' ')[0]}
              </p>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email || session?.user.email}
              </p>
            </div>
          </Link>
          <button
            onClick={() => handleLogout()}
            title="Sair"
            style={{
              padding: '0.3rem',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background-color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fff'
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:block" style={{ height: '100%', flexShrink: 0 }}>
        {sidebarContent}
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden"
        style={{
          position: 'fixed',
          top: '0.875rem',
          left: '1rem',
          zIndex: 55,
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: '#0f172a',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: 45,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {sidebarContent}
      </div>
    </>
  )
}
