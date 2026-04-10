import { useState } from 'react'
import { X, Flag } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useContestCM } from '@/hooks/useContestCM'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import { CMWorkflowStage } from '@/types/enums'
import type { CMWithSteps, CMStep } from '@/types/domain'

interface ContestModalProps {
  cm: CMWithSteps
  actorId: string
  onClose: () => void
}

export function ContestModal({ cm, actorId, onClose }: ContestModalProps) {
  const contestMutation            = useContestCM()
  const { profile }                = useAuth()
  const { data: departments = [] } = useDepartments()

  // When the CM is refused, only the refused step itself is contestable.
  // At vendas_finalize, all approved/contest_response steps are contestable.
  const contestableSteps = (cm.steps ?? []).filter(s => {
    if (!s.from_dept_id) return false
    if (cm.workflow_stage === CMWorkflowStage.Refused) return s.action === 'refused'
    return ['approved', 'contest_response'].includes(s.action)
  })

  const autoStep = contestableSteps.length === 1 ? contestableSteps[0] : null

  const [selectedStepId, setSelectedStepId] = useState(autoStep?.id ?? '')
  const [reason, setReason]                 = useState('')
  const [error, setError]                   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedStepId) { setError('Selecione a etapa a ser contestada'); return }
    if (!reason.trim())  { setError('O motivo da contestação é obrigatório'); return }
    try {
      await contestMutation.mutateAsync({ cmId: cm.id, stepId: selectedStepId, reason, actorId })

      // Email para o dept contestado
      const targetStep = contestableSteps.find(s => s.id === selectedStepId)
      const targetDept = departments.find(d => d.id === targetStep?.from_dept_id)
      if (targetDept) {
        notifyCM({
          cm,
          toDept:       targetDept,
          fromDeptName: profile?.department?.name ?? 'Vendas',
          actorName:    profile?.full_name ?? '',
          notes:        reason,
          eventType:    'contested',
        })
      }

      toast.success('Contestação enviada')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contestar')
    }
  }

  const stepLabel = (step: CMStep) => {
    const dept = step.from_department?.name ?? step.from_dept_id
    const date = new Date(step.created_at).toLocaleDateString('pt-BR')
    const actionLabels: Record<string, string> = { approved: 'Aprovação', contest_response: 'Resposta à contestação', refused: 'Recusa' }
    const action = actionLabels[step.action] ?? step.action
    return `${action} — ${dept} (${date})`
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Contestar Etapa</h3>
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

          {contestableSteps.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Nenhuma etapa disponível para contestação.</p>
          ) : autoStep ? (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef3c7', border: '1px solid #fcd34d', fontSize: 13, color: '#92400e' }}>
              Contestando: <strong>{stepLabel(autoStep)}</strong>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Etapa a contestar <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedStepId}
                onChange={(e) => setSelectedStepId(e.target.value)}
                required
                style={{
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
                }}
                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
                onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              >
                <option value="">Selecione a etapa...</option>
                {contestableSteps.map(step => (
                  <option key={step.id} value={step.id}>{stepLabel(step)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Motivo da contestação <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Textarea
              placeholder="Descreva por que você está contestando esta etapa e quais informações adicionais precisam ser reavaliadas..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={contestMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={contestMutation.isPending}
              disabled={contestableSteps.length === 0}
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' } as React.CSSProperties}
            >
              <Flag size={14} />
              Contestar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
