import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useApproveCM } from '@/hooks/useApproveCM'
import { useApproveParallelBranch } from '@/hooks/useApproveParallelBranch'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import type { CMWithSteps, Department } from '@/types/domain'

interface ApproveModalProps {
  cm: CMWithSteps
  actorId: string
  /** If true, calls approve_parallel_branch instead of approve_cm */
  isParallel?: boolean
  /** Overrides the modal title and submit label (e.g. "Encaminhar" when Vendas forwards from finalization) */
  title?: string
  onClose: () => void
}

export function ApproveModal({ cm, actorId, isParallel = false, title = 'Aprovar', onClose }: ApproveModalProps) {
  const approveMutation         = useApproveCM()
  const approveParallelMutation = useApproveParallelBranch()
  const { profile }             = useAuth()
  const { data: departments = [] } = useDepartments()

  const currentSlug = cm.current_department?.slug ?? ''
  const otherDepts  = departments.filter(d => d.slug !== currentSlug)

  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [notes, setNotes]                   = useState('')
  const [error, setError]                   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isParallel) {
      try {
        await approveParallelMutation.mutateAsync({ cmId: cm.id, notes, actorId })

        const fromDeptName = profile?.department?.name ?? ''
        const actorName    = profile?.full_name ?? ''
        const pendingBranches = (cm.parallel_branches ?? []).filter(
          b => b.status === 'pending' && b.dept_id !== profile?.department_id,
        )
        pendingBranches.forEach(b => {
          if (b.department) {
            notifyCM({ cm, toDept: b.department, fromDeptName, actorName, eventType: 'approved' })
          }
        })

        toast.success('Aprovação registrada com sucesso')
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao aprovar')
      }
      return
    }

    if (!selectedDeptId) { setError('Selecione o departamento de destino'); return }

    try {
      await approveMutation.mutateAsync({ cmId: cm.id, toDeptId: selectedDeptId, notes, actorId })

      const toDept       = departments.find((d: Department) => d.id === selectedDeptId)
      const fromDeptName = profile?.department?.name ?? ''
      const actorName    = profile?.full_name ?? ''
      if (toDept) {
        notifyCM({
          cm, toDept, fromDeptName, actorName, eventType: 'approved',
          ...(toDept.slug === 'vendas' && cm.created_by ? { toUserId: cm.created_by } : {}),
        })
      }

      toast.success('Aprovação registrada com sucesso')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar')
    }
  }

  const isPending = isParallel ? approveParallelMutation.isPending : approveMutation.isPending

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{title}</h3>
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

          {/* Dept selector — only for sequential approve */}
          {!isParallel && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                Encaminhar para <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {otherDepts.map(dept => {
                  const isSelected = dept.id === selectedDeptId
                  return (
                    <label
                      key={dept.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '0.5rem 0.75rem',
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        backgroundColor: isSelected ? '#eff6ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      <input
                        type="radio"
                        name="toDept"
                        value={dept.id}
                        checked={isSelected}
                        onChange={() => setSelectedDeptId(dept.id)}
                        style={{ accentColor: '#2563eb', cursor: 'pointer', width: 14, height: 14 }}
                      />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1e40af' : '#374151' }}>
                        {dept.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Observações
            </label>
            <Textarea
              placeholder="Descreva sua análise ou deixe em branco caso não haja observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" isLoading={isPending}>
              <CheckCircle size={14} />
              {title}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
