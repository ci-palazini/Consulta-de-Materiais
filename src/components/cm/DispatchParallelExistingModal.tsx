import { useState } from 'react'
import { X, GitBranch } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useDispatchParallelExisting } from '@/hooks/useDispatchParallelExisting'
import { useDepartments } from '@/hooks/useDepartments'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import { DepartmentSlug } from '@/types/enums'
import type { CM } from '@/types/domain'

interface DispatchParallelExistingModalProps {
  cm: CM
  actorId: string
  onClose: () => void
}

const EXCLUDED_SLUGS = [DepartmentSlug.Vendas, DepartmentSlug.Custos, DepartmentSlug.Pricing]

export function DispatchParallelExistingModal({ cm, actorId, onClose }: DispatchParallelExistingModalProps) {
  const { data: departments = [] } = useDepartments()
  const dispatchMutation = useDispatchParallelExisting()
  const { profile } = useAuth()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [notes, setNotes]             = useState('')
  const [error, setError]             = useState<string | null>(null)

  const options = departments.filter(d => !EXCLUDED_SLUGS.includes(d.slug as any))

  const toggleDept = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (selectedIds.length === 0) { setError('Selecione ao menos um departamento'); return }
    try {
      await dispatchMutation.mutateAsync({ cmId: cm.id, deptIds: selectedIds, notes, actorId })

      // Notificar por email cada departamento selecionado
      const fromDeptName = profile?.department?.name ?? ''
      const actorName    = profile?.full_name ?? ''
      selectedIds.forEach(deptId => {
        const dept = departments.find(d => d.id === deptId)
        if (dept) notifyCM({ cm, toDept: dept, fromDeptName, actorName, notes, eventType: 'dispatched_parallel' })
      })

      toast.success('Análise paralela iniciada')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar análise paralela')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Iniciar Análise Paralela</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{cm.number} · {cm.title}</p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
              Departamentos para análise <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map(dept => {
                const checked = selectedIds.includes(dept.id)
                return (
                  <label
                    key={dept.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0.625rem 0.875rem',
                      borderRadius: 8,
                      border: `1.5px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
                      backgroundColor: checked ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDept(dept.id)}
                      style={{ width: 15, height: 15, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: checked ? 600 : 400, color: checked ? '#1e40af' : '#374151' }}>
                      {dept.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Observações
            </label>
            <Textarea
              placeholder="Instruções ou contexto para os departamentos selecionados..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12.5, color: '#1e40af' }}>
            Todos os departamentos selecionados precisam aprovar para que a CM avance. Se qualquer um recusar, a CM é encerrada.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={dispatchMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={dispatchMutation.isPending}>
              <GitBranch size={14} />
              Iniciar Análise
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
