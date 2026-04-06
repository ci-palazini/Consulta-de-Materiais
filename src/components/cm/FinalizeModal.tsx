import { useState } from 'react'
import { X, CheckCircle, XCircle } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { useFinalizeCM } from '@/hooks/useFinalizeCM'
import { toast } from '@/store/toastStore'
import type { CM } from '@/types/domain'

interface FinalizeModalProps {
  cm: CM
  actorId: string
  onClose: () => void
}

export function FinalizeModal({ cm, actorId, onClose }: FinalizeModalProps) {
  const finalizeMutation = useFinalizeCM()

  const [viability, setViability] = useState<boolean | null>(null)
  const [ovNumber, setOvNumber]   = useState('')
  const [notes, setNotes]         = useState('')
  const [error, setError]         = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (viability === null) { setError('Selecione a viabilidade da consulta'); return }
    if (viability && !ovNumber.trim()) { setError('Número da OV é obrigatório para CMs viáveis'); return }
    if (!notes.trim()) { setError('Observações finais são obrigatórias'); return }
    try {
      await finalizeMutation.mutateAsync({ cmId: cm.id, viability, ovNumber: ovNumber.trim() || null, notes, actorId })
      toast.success(viability ? 'CM finalizada como viável!' : 'CM finalizada como não viável')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Finalizar CM</h3>
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

          {/* Viability selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.625rem' }}>
              Viabilidade <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { value: true,  icon: CheckCircle, label: 'Viável', activeBg: '#f0fdf4', activeBorder: '#16a34a', activeColor: '#15803d' },
                { value: false, icon: XCircle,     label: 'Não Viável', activeBg: '#fef2f2', activeBorder: '#dc2626', activeColor: '#dc2626' },
              ] as const).map(({ value, icon: Icon, label, activeBg, activeBorder, activeColor }) => {
                const isSelected = viability === value
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setViability(value)}
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
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* OV Number */}
          {viability === true && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Número da OV <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <Input
                placeholder="Ex: OV-2024-0001"
                value={ovNumber}
                onChange={(e) => setOvNumber(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Observações finais <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Textarea
              placeholder="Descreva o resultado da análise, decisão tomada e quaisquer informações relevantes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Warning */}
          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: 12.5, color: '#92400e' }}>
            Esta ação é irreversível. A CM será encerrada e todos os envolvidos serão notificados.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={finalizeMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={viability === false ? 'danger' : 'success'}
              isLoading={finalizeMutation.isPending}
              disabled={viability === null}
            >
              {viability === false ? <XCircle size={14} /> : <CheckCircle size={14} />}
              Finalizar CM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
