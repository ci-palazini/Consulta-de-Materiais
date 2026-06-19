import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useCancelCM } from '@/hooks/useCancelCM'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import type { CMWithSteps } from '@/types/domain'

interface CancelModalProps {
  cm: CMWithSteps
  actorId: string
  onClose: () => void
}

export function CancelModal({ cm, actorId, onClose }: CancelModalProps) {
  const cancelMutation = useCancelCM()
  const { profile }    = useAuth()

  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await cancelMutation.mutateAsync({ cmId: cm.id, notes, actorId })

      // Notifica por email o departamento que estava com a CM (se houver)
      if (cm.current_department) {
        notifyCM({
          cm,
          toDept: cm.current_department,
          fromDeptName: profile?.department?.name ?? '',
          actorName: profile?.full_name ?? '',
          notes,
          eventType: 'cancelled',
        })
      }

      toast.success('CM cancelada')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#b45309' }}>Cancelar CM</h3>
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
              Motivo do cancelamento <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <Textarea
              placeholder="Descreva por que esta consulta está sendo cancelada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: 12.5, color: '#92400e' }}>
            A CM será encerrada como <strong>cancelada</strong> e sairá das filas em andamento. O histórico é preservado e o departamento que estava com ela será notificado.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={cancelMutation.isPending}>
              Voltar
            </Button>
            <Button type="submit" variant="danger" isLoading={cancelMutation.isPending}>
              <Trash2 size={14} />
              Cancelar CM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
