import { useMemo, useState } from 'react'
import { ArrowRightCircle, X } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useJumpExistingStage } from '@/hooks/useJumpExistingStage'
import { useDepartments } from '@/hooks/useDepartments'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'
import { CMWorkflowStage, DepartmentSlug } from '@/types/enums'
import type { CMWorkflowStageType, DepartmentSlugType } from '@/types/enums'
import type { CMWithSteps } from '@/types/domain'

interface JumpStageModalProps {
  cm: CMWithSteps
  actorId: string
  onClose: () => void
}

const EXISTING_FLOW_ORDER: CMWorkflowStageType[] = [
  CMWorkflowStage.ExistingPricing1,
  CMWorkflowStage.ExistingCustos,
  CMWorkflowStage.ExistingParallel,
  CMWorkflowStage.ExistingCustos2,
  CMWorkflowStage.ExistingPricing2,
  CMWorkflowStage.VendasFinalize,
]

const STAGE_LABELS: Record<CMWorkflowStageType, string> = {
  [CMWorkflowStage.NewItemProjetos]: 'Engenharia de Projetos',
  [CMWorkflowStage.NewItemSuprimentos]: 'Suprimentos',
  [CMWorkflowStage.NewItemParallel]: 'Análise Paralela',
  [CMWorkflowStage.NewItemCustos]: 'Custos',
  [CMWorkflowStage.NewItemPricing]: 'Pricing',
  [CMWorkflowStage.ExistingPricing1]: 'Pricing (1ª análise)',
  [CMWorkflowStage.ExistingCustos]: 'Custos (triagem)',
  [CMWorkflowStage.ExistingParallel]: 'Análise Paralela',
  [CMWorkflowStage.ExistingCustos2]: 'Custos (consolidação)',
  [CMWorkflowStage.ExistingPricing2]: 'Pricing (consolidação)',
  [CMWorkflowStage.VendasFinalize]: 'Finalização em Vendas',
  [CMWorkflowStage.Contestation]: 'Contestação',
  [CMWorkflowStage.Finalized]: 'Finalizada',
  [CMWorkflowStage.Refused]: 'Recusada',
}

const STAGE_TO_DEPT_SLUG: Partial<Record<CMWorkflowStageType, DepartmentSlugType>> = {
  [CMWorkflowStage.ExistingCustos]: DepartmentSlug.Custos,
  [CMWorkflowStage.ExistingCustos2]: DepartmentSlug.Custos,
  [CMWorkflowStage.ExistingPricing2]: DepartmentSlug.Pricing,
  [CMWorkflowStage.VendasFinalize]: DepartmentSlug.Vendas,
}

const PARALLEL_EXCLUDED_SLUGS: DepartmentSlugType[] = [
  DepartmentSlug.Vendas,
  DepartmentSlug.Custos,
  DepartmentSlug.Pricing,
]

function getFutureExistingStages(stage: CMWorkflowStageType): CMWorkflowStageType[] {
  const currentIndex = EXISTING_FLOW_ORDER.findIndex((s) => s === stage)
  if (currentIndex < 0) return []
  return EXISTING_FLOW_ORDER.slice(currentIndex + 1)
}

export function JumpStageModal({ cm, actorId, onClose }: JumpStageModalProps) {
  const jumpMutation = useJumpExistingStage()
  const { data: departments = [] } = useDepartments()
  const { profile } = useAuth()

  const futureTargets = useMemo(() => getFutureExistingStages(cm.workflow_stage), [cm.workflow_stage])
  const [targetStage, setTargetStage] = useState<CMWorkflowStageType | ''>(futureTargets[0] ?? '')
  const [parallelDeptIds, setParallelDeptIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedTargetStage: CMWorkflowStageType | '' = targetStage && futureTargets.includes(targetStage)
    ? targetStage
    : (futureTargets[0] ?? '')
  const isParallelTarget = selectedTargetStage === CMWorkflowStage.ExistingParallel
  const parallelOptions = departments.filter((dept) => !PARALLEL_EXCLUDED_SLUGS.includes(dept.slug as DepartmentSlugType))

  const toggleParallelDept = (deptId: string) => {
    setParallelDeptIds((prev) => (prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]))
  }

  const handleTargetChange = (stage: CMWorkflowStageType) => {
    setTargetStage(stage)
    if (stage !== CMWorkflowStage.ExistingParallel) {
      setParallelDeptIds([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTargetStage) {
      setError('Selecione a etapa de destino')
      return
    }

    if (!notes.trim()) {
      setError('A justificativa do pulo é obrigatória')
      return
    }

    if (isParallelTarget && parallelDeptIds.length === 0) {
      setError('Selecione ao menos um departamento para análise paralela')
      return
    }

    try {
      await jumpMutation.mutateAsync({
        cmId: cm.id,
        targetStage: selectedTargetStage,
        notes: notes.trim(),
        actorId,
        parallelDeptIds: isParallelTarget ? parallelDeptIds : undefined,
      })

      const fromDeptName = profile?.department?.name ?? ''
      const actorName = profile?.full_name ?? ''

      if (isParallelTarget) {
        parallelDeptIds.forEach((deptId) => {
          const dept = departments.find((d) => d.id === deptId)
          if (dept) {
            notifyCM({ cm, toDept: dept, fromDeptName, actorName, notes, eventType: 'jumped' })
          }
        })
      } else {
        const targetSlug = STAGE_TO_DEPT_SLUG[selectedTargetStage]
        const dept = departments.find((d) => d.slug === targetSlug)
        if (dept) {
          notifyCM({ cm, toDept: dept, fromDeptName, actorName, notes, eventType: 'jumped' })
        }
      }

      toast.success('Pulo de etapa registrado')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pular etapa')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Pular Etapa</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{cm.number} · {cm.title}</p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = '#0f172a'; (ev.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc' }}
            onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (ev.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12.5, color: '#475569' }}>
            Etapa atual: <strong>{STAGE_LABELS[cm.workflow_stage]}</strong>. O pulo permite apenas etapas futuras.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
              Etapa de destino <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {futureTargets.map((stageOption) => {
                const checked = selectedTargetStage === stageOption
                return (
                  <label
                    key={stageOption}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0.625rem 0.875rem',
                      borderRadius: 8,
                      border: `1.5px solid ${checked ? '#7c3aed' : '#e2e8f0'}`,
                      backgroundColor: checked ? '#f5f3ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    <input
                      type="radio"
                      checked={checked}
                      onChange={() => handleTargetChange(stageOption)}
                      style={{ width: 15, height: 15, accentColor: '#7c3aed', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: checked ? 600 : 500, color: checked ? '#5b21b6' : '#374151' }}>
                      {STAGE_LABELS[stageOption]}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {isParallelTarget && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                Departamentos para análise paralela <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {parallelOptions.map((dept) => {
                  const checked = parallelDeptIds.includes(dept.id)
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
                        onChange={() => toggleParallelDept(dept.id)}
                        style={{ width: 15, height: 15, accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: checked ? 600 : 500, color: checked ? '#1d4ed8' : '#374151' }}>
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
              Justificativa do pulo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Textarea
              placeholder="Explique por que a etapa está sendo pulada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={jumpMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" isLoading={jumpMutation.isPending}>
              <ArrowRightCircle size={14} />
              Confirmar Pulo
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
