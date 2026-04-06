import { useToastStore, type ToastType } from '@/store/toastStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const TYPE_CONFIG: Record<ToastType, { icon: React.ElementType; bg: string; border: string; color: string }> = {
  success: { icon: CheckCircle, bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  error:   { icon: XCircle,     bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  info:    { icon: Info,        bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 200,
        maxWidth: 380,
      }}
    >
      {toasts.map((toast) => {
        const config = TYPE_CONFIG[toast.type]
        const Icon = config.icon
        return (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '0.875rem 1rem',
              backgroundColor: config.bg,
              border: `1px solid ${config.border}`,
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Icon size={18} style={{ color: config.color, flexShrink: 0, marginTop: 1 }} />
            <p style={{ flex: 1, fontSize: 13.5, color: '#0f172a', lineHeight: 1.5 }}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                padding: '0.125rem',
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#0f172a')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
