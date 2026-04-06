import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/hooks/useAdminUsers'
import { Button, Input } from '@/components/ui'
import { Pencil, Check, X, User, Building2, Shield, Mail } from 'lucide-react'

export function ProfilePage() {
  const { profile } = useAuth()
  const updateMutation = useUpdateProfile()

  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!profile) return
    if (!fullName.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setError(null)
    try {
      await updateMutation.mutateAsync({
        id: profile.id,
        fullName: fullName.trim(),
        departmentId: profile.department_id,
        role: profile.role,
      })
      // Profile will be refetched automatically by AuthProvider on next auth event
      // or we can trigger a page reload for immediate update
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  const handleCancel = () => {
    setFullName(profile?.full_name || '')
    setError(null)
    setIsEditing(false)
  }

  return (
    <div style={{ maxWidth: 520 }} className="animate-fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
        Meu Perfil
      </h1>

      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Avatar section */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#1d4ed8',
            flexShrink: 0,
          }}>
            {profile?.avatar_initials || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  autoFocus
                  style={{ fontSize: 15, fontWeight: 500 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
                {error && (
                  <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}>
                    <Check size={13} />
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel} disabled={updateMutation.isPending}>
                    <X size={13} />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{profile?.full_name || '—'}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    title="Editar nome"
                    style={{
                      padding: '0.25rem',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      transition: 'color 0.15s, background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{profile?.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow icon={Mail} label="Email" value={profile?.email || '—'} />
          <InfoRow icon={Building2} label="Departamento" value={profile?.department?.name || '—'} />
          <InfoRow
            icon={Shield}
            label="Perfil de acesso"
            value={profile?.role === 'admin' ? 'Administrador' : 'Membro'}
            badge={profile?.role === 'admin'}
          />
          <InfoRow icon={User} label="ID" value={profile?.id.slice(0, 8) + '...' || '—'} mono />
        </div>

        {/* Help text */}
        <div style={{ padding: '0.875rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Para alterar departamento ou perfil de acesso, entre em contato com um administrador.
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, badge, mono }: { icon: React.ElementType; label: string; value: string; badge?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} style={{ color: '#64748b' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 14, color: '#0f172a', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
          {badge && (
            <span style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: '0.1rem 0.4rem',
              borderRadius: 999,
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
            }}>
              Admin
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
