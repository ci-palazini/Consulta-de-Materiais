import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useDepartments } from '@/hooks/useDepartments'
import { useForwardCM } from '@/hooks/useForwardCM'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import { useAuth } from '@/hooks/useAuth'
import type { CM } from '@/types/domain'

interface ForwardModalProps {
  cm: CM
  actorId: string
  onClose: () => void
}

export function ForwardModal({ cm, actorId, onClose }: ForwardModalProps) {
  const { data: departments = [] } = useDepartments()
  const forwardMutation = useForwardCM()
  const { profile } = useAuth()

  const [toDeptId, setToDeptId] = useState('')
  const [notes, setNotes]       = useState('')
  const [error, setError]       = useState<string | null>(null)

  const options = departments.filter((d) => d.id !== cm.current_dept_id)
  const selectedDept = departments.find((d) => d.id === toDeptId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!toDeptId) { setError('Selecione o departamento de destino'); return }
    try {
      await forwardMutation.mutateAsync({ cmId: cm.id, toDeptId, notes, actorId })
      toast.success(`CM encaminhada para ${selectedDept?.name || 'departamento'}`)

      if (selectedDept) {
        notifyCM({
          cm,
          toDept:       selectedDept,
          fromDeptName: profile?.department?.name ?? 'Desconhecido',
          actorName:    profile?.full_name ?? 'Desconhecido',
          notes:        notes || undefined,
          eventType:    'forwarded',
        })
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encaminhar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Encaminhar CM</h3>
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
              Encaminhar para <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={toDeptId}
              onChange={(e) => setToDeptId(e.target.value)}
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
              <option value="">Selecione o departamento...</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Observações
            </label>
            <Textarea
              placeholder="Descreva o motivo do encaminhamento ou instruções para o próximo departamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={forwardMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={forwardMutation.isPending}>
              <Send size={14} />
              Encaminhar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
