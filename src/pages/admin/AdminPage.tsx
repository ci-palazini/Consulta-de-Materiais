import { useState } from 'react'
import { useAllProfiles, useCreateUser, useUpdateProfile, useDeleteProfile } from '@/hooks/useAdminUsers'
import { useDepartments, useUpdateDepartment } from '@/hooks/useDepartments'
import { Button, Input } from '@/components/ui'
import { Users, Building2, Plus, Pencil, Trash2, X, Check, Shield, User, AlertTriangle } from 'lucide-react'
import type { Profile, Department } from '@/types/domain'

type Tab = 'users' | 'departments'

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 0.75rem',
  fontSize: 13.5,
  fontFamily: 'inherit',
  color: '#0f172a',
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  outline: 'none',
  cursor: 'pointer',
}

// ── User Form Modal ──────────────────────────────────────────────
function UserFormModal({ profile, departments, onClose }: { profile?: Profile; departments: Department[]; onClose: () => void }) {
  const createMutation = useCreateUser()
  const updateMutation = useUpdateProfile()
  const isEdit = !!profile

  const [fullName,     setFullName]     = useState(profile?.full_name || '')
  const [email,        setEmail]        = useState(profile?.email || '')
  const [password,     setPassword]     = useState('')
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '')
  const [role,         setRole]         = useState<'member' | 'admin'>(profile?.role || 'member')
  const [error,        setError]        = useState<string | null>(null)

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fullName.trim() || !departmentId) { setError('Nome e departamento são obrigatórios'); return }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: profile!.id, fullName, departmentId, role })
      } else {
        if (!email.trim() || !password.trim()) { setError('Email e senha são obrigatórios'); return }
        await createMutation.mutateAsync({ email, password, fullName, departmentId, role })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome completo *</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="João da Silva" required />
          </div>

          {!isEdit && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Email *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@empresa.com" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Senha inicial *</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Departamento *</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              style={SELECT_STYLE}
              onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
            >
              <option value="">Selecione...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Perfil</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['member', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    border: `1px solid ${role === r ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: role === r ? '#eff6ff' : '#fff',
                    color: role === r ? '#1d4ed8' : '#64748b',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'admin' ? <Shield size={14} /> : <User size={14} />}
                  {r === 'admin' ? 'Admin' : 'Membro'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" isLoading={isPending}>
              <Check size={14} />
              {isEdit ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Department row ───────────────────────────────────────────────
function DeptRow({ dept }: { dept: Department }) {
  const updateMutation = useUpdateDepartment()
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(dept.name)

  const handleSave = async () => {
    if (!name.trim()) return
    await updateMutation.mutateAsync({ id: dept.id, name, display_order: dept.display_order })
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
        {dept.display_order}
      </div>

      {editing ? (
        <>
          <Input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          />
          <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}><Check size={13} /></Button>
          <Button size="sm" variant="ghost" onClick={() => { setName(dept.name); setEditing(false) }}><X size={13} /></Button>
        </>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: '#0f172a' }}>{dept.name}</span>
          <span style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace' }}>{dept.slug}</span>
          <button onClick={() => setEditing(true)} style={{ padding: '0.25rem 0.375rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'color 0.15s, background-color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <Pencil size={14} />
          </button>
        </>
      )}
    </div>
  )
}

// ── Delete confirm ───────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel, isLoading }: { name: string; onConfirm: () => void; onCancel: () => void; isLoading: boolean }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: 380 }}>
        <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Remover usuário?</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              <strong>{name}</strong> será removido do sistema. Esta ação não pode ser desfeita.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onCancel} disabled={isLoading}>Cancelar</Button>
            <Button variant="danger" style={{ flex: 1 }} onClick={onConfirm} isLoading={isLoading}>Remover</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main AdminPage ───────────────────────────────────────────────
export function AdminPage() {
  const [tab, setTab]                   = useState<Tab>('users')
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>()
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const { data: profiles    = [], isLoading: loadingProfiles } = useAllProfiles()
  const { data: departments = [], isLoading: loadingDepts }    = useDepartments()
  const deleteMutation = useDeleteProfile()

  const deletingProfile = profiles.find((p) => p.id === deletingId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 800 }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Administração</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Gerencie usuários e departamentos do sistema</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'inline-flex', backgroundColor: '#f8fafc', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0', gap: 2 }}>
        {([
          { value: 'users',       label: 'Usuários',      icon: Users },
          { value: 'departments', label: 'Departamentos', icon: Building2 },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.4rem 0.875rem',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              backgroundColor: tab === value ? '#fff' : 'transparent',
              color: tab === value ? '#0f172a' : '#64748b',
              boxShadow: tab === value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>Usuários</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{profiles.length} usuário{profiles.length !== 1 ? 's' : ''} cadastrado{profiles.length !== 1 ? 's' : ''}</p>
            </div>
            <Button size="sm" onClick={() => { setEditingProfile(undefined); setShowUserForm(true) }}>
              <Plus size={14} />
              Novo Usuário
            </Button>
          </div>

          {loadingProfiles ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', fontSize: 13, color: '#64748b' }}>Nenhum usuário cadastrado</div>
          ) : (
            <div>
              {profiles.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f8fafc', transition: 'background-color 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1d4ed8', flexShrink: 0 }}>
                    {p.avatar_initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {p.department && (
                      <span style={{ fontSize: 12, color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                        {(p as any).department?.name || '-'}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 999,
                      backgroundColor: p.role === 'admin' ? '#f5f3ff' : '#f8fafc',
                      color: p.role === 'admin' ? '#6d28d9' : '#64748b',
                    }}>
                      {p.role === 'admin' ? 'Admin' : 'Membro'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => { setEditingProfile(p); setShowUserForm(true) }}
                      style={{ padding: '0.3rem 0.4rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'color 0.15s, background-color 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingId(p.id)}
                      style={{ padding: '0.3rem 0.4rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'color 0.15s, background-color 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef2f2' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Departments tab */}
      {tab === 'departments' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>Departamentos</h2>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Clique no ícone de edição para renomear</p>
          </div>
          {loadingDepts ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ padding: '0 1.5rem' }}>
              {departments.map((d) => <DeptRow key={d.id} dept={d} />)}
            </div>
          )}
        </div>
      )}

      {showUserForm && (
        <UserFormModal
          profile={editingProfile}
          departments={departments}
          onClose={() => { setShowUserForm(false); setEditingProfile(undefined) }}
        />
      )}
      {deletingId && deletingProfile && (
        <DeleteConfirm
          name={deletingProfile.full_name}
          onConfirm={async () => { await deleteMutation.mutateAsync(deletingId); setDeletingId(null) }}
          onCancel={() => setDeletingId(null)}
          isLoading={deleteMutation.isPending}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
