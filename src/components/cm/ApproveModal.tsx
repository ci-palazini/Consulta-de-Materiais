import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useApproveCM } from '@/hooks/useApproveCM'
import { useApproveParallelBranch } from '@/hooks/useApproveParallelBranch'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import { supabase } from '@/lib/supabase'
import type { CMWithSteps } from '@/types/domain'

// Maps the stage *before* approval to the slug(s) of the next department(s)
const NEXT_DEPT_SLUGS: Record<string, string[]> = {
  new_item_projetos:    ['suprimentos'],
  new_item_suprimentos: ['eng_processos', 'planejamento', 'qualidade'],
  new_item_custos:      ['pricing'],
  new_item_pricing:     ['vendas'],
  existing_pricing_1:   ['custos'],
  existing_custos:      ['pricing'],
  existing_custos_2:    ['pricing'],
  existing_pricing_2:   ['vendas'],
  contestation:         ['vendas'],
}

interface ApproveModalProps {
  cm: CMWithSteps
  actorId: string
  /** If true, calls approve_parallel_branch instead of approve_cm */
  isParallel?: boolean
  onClose: () => void
}

export function ApproveModal({ cm, actorId, isParallel = false, onClose }: ApproveModalProps) {
  const approveMutation         = useApproveCM()
  const approveParallelMutation = useApproveParallelBranch()
  const { profile }             = useAuth()
  const { data: departments = [] } = useDepartments()

  const mutation = isParallel ? approveParallelMutation : approveMutation

  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isSuprimentosDispatch = cm.workflow_stage === 'new_item_suprimentos'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await mutation.mutateAsync({ cmId: cm.id, notes, actorId })

      // Fire-and-forget email notifications
      const fromDeptName = profile?.department?.name ?? ''
      const actorName    = profile?.full_name ?? ''

      if (!isParallel) {
        const nextSlugs = NEXT_DEPT_SLUGS[cm.workflow_stage] ?? []
        nextSlugs.forEach(slug => {
          const dept = departments.find(d => d.slug === slug)
          if (dept) notifyCM({ cm, toDept: dept, fromDeptName, actorName, eventType: 'approved' })
        })
      } else {
        // Check if all branches are now approved and CM advanced to custos
        const { data: updatedCm } = await supabase
          .from('cms')
          .select('workflow_stage, current_dept_id')
          .eq('id', cm.id)
          .single()

        if (
          updatedCm?.workflow_stage === 'new_item_custos' ||
          updatedCm?.workflow_stage === 'existing_custos_2'
        ) {
          const custosDept = departments.find(d => d.slug === 'custos')
          if (custosDept) notifyCM({ cm, toDept: custosDept, fromDeptName, actorName, eventType: 'approved' })
        }
      }

      toast.success('Aprovação registrada com sucesso')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Aprovar</h3>
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

          {isSuprimentosDispatch && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12.5, color: '#1e40af' }}>
              Ao aprovar, a análise será encaminhada simultaneamente para <strong>Eng. de Processos</strong>, <strong>Planejamento</strong> e <strong>Qualidade</strong>.
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" isLoading={mutation.isPending}>
              <CheckCircle size={14} />
              Aprovar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
