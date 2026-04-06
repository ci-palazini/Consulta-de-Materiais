import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, Clock, ArrowRight, FileCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/types/domain'

const TYPE_CONFIG: Record<Notification['type'], { icon: React.ElementType; bg: string; color: string }> = {
  cm_assigned:  { icon: ArrowRight,  bg: '#eff6ff', color: '#1d4ed8' },
  cm_returned:  { icon: ArrowRight,  bg: '#fff7ed', color: '#c2410c' },
  cm_finalized: { icon: FileCheck,   bg: '#f0fdf4', color: '#15803d' },
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { unreadCount } = useNotificationStore()
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications(profile?.id)

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
    navigate(`/cms/${notification.cm_id}`)
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const recentNotifications = notifications.slice(0, 10)

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          padding: '0.375rem',
          borderRadius: 8,
          border: 'none',
          background: isOpen ? '#f8fafc' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? '#0f172a' : '#64748b',
          transition: 'background-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#0f172a'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#64748b'
          }
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: 10,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            backgroundColor: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Notificações</h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 999,
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                  }}
                >
                  {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                </span>
              )}
            </div>
            {unreadNotifications.length > 0 && (
              <button
                onClick={() => markAllAsRead()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0.25rem 0.5rem',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#2563eb',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
              >
                <CheckCheck size={13} />
                Marcar todas
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid #e2e8f0',
                    borderTopColor: '#2563eb',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : recentNotifications.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bell size={18} style={{ color: '#94a3b8' }} />
                </div>
                <p style={{ fontSize: 13, color: '#64748b' }}>Nenhuma notificação</p>
              </div>
            ) : (
              <div>
                {recentNotifications.map((notification) => {
                  const config = TYPE_CONFIG[notification.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        backgroundColor: notification.read ? 'transparent' : '#fafbff',
                        border: 'none',
                        borderBottom: '1px solid #f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.backgroundColor = notification.read
                          ? 'transparent'
                          : '#fafbff')
                      }
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: config.bg,
                          color: config.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            color: '#0f172a',
                            fontWeight: notification.read ? 400 : 500,
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {notification.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Clock size={11} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: '#2563eb',
                                marginLeft: 4,
                              }}
                            />
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          title="Marcar como lida"
                          style={{
                            padding: '0.25rem',
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            flexShrink: 0,
                            transition: 'color 0.15s, background-color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#16a34a'
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0fdf4'
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
                            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                          }}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Mostrando 10 de {notifications.length} notificações
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
