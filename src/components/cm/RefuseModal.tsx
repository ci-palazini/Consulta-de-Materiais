import { useState } from 'react'
import { X, XCircle } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useRefuseCM } from '@/hooks/useRefuseCM'
import { useRefuseParallelBranch } from '@/hooks/useRefuseParallelBranch'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import type { CMWithSteps } from '@/types/domain'

interface RefuseModalProps {
  cm: CMWithSteps
  actorId: string
  /** If true, calls refuse_parallel_branch instead of refuse_cm */
  isParallel?: boolean
  onClose: () => void
}

export function RefuseModal({ cm, actorId, isParallel = false, onClose }: RefuseModalProps) {
  const refuseMutation        = useRefuseCM()
  const refuseParallelMutation = useRefuseParallelBranch()
  const { profile }                = useAuth()
  const { data: departments = [] } = useDepartments()

  const mutation = isParallel ? refuseParallelMutation : refuseMutation

  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!notes.trim()) { setError('O motivo da recusa é obrigatório'); return }
    try {
      await mutation.mutateAsync({ cmId: cm.id, notes, actorId })

      const fromDeptName = profile?.department?.name ?? ''
      const actorName    = profile?.full_name ?? ''

      // Notify Vendas (always the creator dept) — look up by slug to avoid null cm.creator
      const vendasDept = departments.find(d => d.slug === 'vendas')
      if (vendasDept) {
        notifyCM({
          cm, toDept: vendasDept, fromDeptName, actorName, notes, eventType: 'refused',
          ...(cm.created_by ? { toUserId: cm.created_by } : {}),
        })
      }

      // When parallel, notify other pending branches so they know not to continue
      if (isParallel) {
        const pendingBranches = (cm.parallel_branches ?? []).filter(
          b => b.status === 'pending' && b.dept_id !== profile?.department_id,
        )
        pendingBranches.forEach(b => {
          if (b.department) {
            notifyCM({ cm, toDept: b.department, fromDeptName, actorName, notes, eventType: 'refused' })
          }
        })
      }

      toast.success('CM recusada')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recusar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#dc2626' }}>Recusar CM</h3>
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Motivo da recusa <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Textarea
              placeholder="Descreva o motivo pelo qual esta consulta não pode prosseguir..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 12.5, color: '#991b1b' }}>
            Esta ação é irreversível. A CM será encerrada como <strong>não viável</strong> e todos os envolvidos serão notificados.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" isLoading={mutation.isPending}>
              <XCircle size={14} />
              Recusar CM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
