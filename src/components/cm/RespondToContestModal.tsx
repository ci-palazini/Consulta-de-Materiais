import { useState } from 'react'
import { X, CheckCircle, XCircle } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useRespondToContest } from '@/hooks/useRespondToContest'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import type { CMWithSteps } from '@/types/domain'

interface RespondToContestModalProps {
  cm: CMWithSteps
  actorId: string
  onClose: () => void
}

export function RespondToContestModal({ cm, actorId, onClose }: RespondToContestModalProps) {
  const respondMutation            = useRespondToContest()
  const { profile }                = useAuth()
  const { data: departments = [] } = useDepartments()

  const [response, setResponse] = useState<'ok' | 'refused' | null>(null)
  const [notes, setNotes]       = useState('')
  const [error, setError]       = useState<string | null>(null)

  // Parallel branches that were cancelled by the refusal (all will be pending again after ok)
  const parallelBranches = cm.parallel_branches ?? []
  const isParallelContestation = parallelBranches.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!response) { setError('Selecione sua resposta'); return }
    try {
      await respondMutation.mutateAsync({ cmId: cm.id, response, notes, actorId })

      const fromDeptName = profile?.department?.name ?? ''
      const actorName    = profile?.full_name ?? ''

      // Email para Vendas — apenas quem abriu a CM
      const vendasDept = departments.find(d => d.slug === 'vendas')
      if (vendasDept) {
        notifyCM({
          cm,
          toDept:       vendasDept,
          fromDeptName,
          actorName,
          notes,
          eventType:    'contest_response',
          ...(cm.created_by ? { toUserId: cm.created_by } : {}),
        })
      }

      // Quando aceita e vinha de análise paralela, avisar todos os depts
      // que a análise foi reaberta e precisam continuar trabalhando
      if (response === 'ok' && isParallelContestation) {
        parallelBranches.forEach(branch => {
          if (branch.department) {
            notifyCM({
              cm,
              toDept:       branch.department,
              fromDeptName,
              actorName,
              notes: notes || undefined,
              eventType:    'dispatched_parallel',
            })
          }
        })
      }

      toast.success('Resposta enviada para Vendas')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao responder')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Responder Contestação</h3>
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
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {error && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {cm.contest_reason && (
            <div style={{ padding: '0.75rem 0.875rem', borderRadius: 8, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', fontSize: 13, color: '#7c2d12' }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Motivo da contestação por Vendas:</p>
              <p style={{ fontStyle: 'italic' }}>"{cm.contest_reason}"</p>
            </div>
          )}

          {/* Response selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.625rem' }}>
              Sua resposta <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { value: 'ok' as const,      icon: CheckCircle, label: 'Aceito reconsiderar',   activeBg: '#f0fdf4', activeBorder: '#16a34a', activeColor: '#15803d' },
                { value: 'refused' as const, icon: XCircle,     label: 'Mantenho minha análise', activeBg: '#fef2f2', activeBorder: '#dc2626', activeColor: '#dc2626' },
              ]).map(({ value, icon: Icon, label, activeBg, activeBorder, activeColor }) => {
                const isSelected = response === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResponse(value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '1rem',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? activeBorder : '#e2e8f0'}`,
                      backgroundColor: isSelected ? activeBg : '#fff',
                      color: isSelected ? activeColor : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon size={22} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Observações
            </label>
            <Textarea
              placeholder="Justifique sua resposta ou forneça informações adicionais para Vendas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {response === 'ok' && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12.5, color: '#15803d' }}>
              A CM voltará para seu departamento no fluxo normal. Você poderá encaminhá-la para qualquer departamento ou para Vendas encerrar.
            </div>
          )}
          {response === 'refused' && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12.5, color: '#1e40af' }}>
              A CM voltará para Vendas com sua resposta, mantendo sua análise original.
            </div>
          )}
          {!response && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12.5, color: '#64748b' }}>
              Selecione sua resposta acima para continuar.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={respondMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={respondMutation.isPending} disabled={!response}>
              Enviar Resposta
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
