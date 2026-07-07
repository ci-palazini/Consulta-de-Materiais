import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCM } from '@/hooks/useCM'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { CMStatusBadge } from '@/components/cm/CMStatusBadge'
import { ApproveModal } from '@/components/cm/ApproveModal'
import { RefuseModal } from '@/components/cm/RefuseModal'
import { DispatchParallelExistingModal } from '@/components/cm/DispatchParallelExistingModal'
import { FinalizeModal } from '@/components/cm/FinalizeModal'
import { ContestModal } from '@/components/cm/ContestModal'
import { RespondToContestModal } from '@/components/cm/RespondToContestModal'
import { CancelModal } from '@/components/cm/CancelModal'
import { AttachmentsSection } from '@/components/cm/AttachmentsSection'
import {
  AlertCircle, ArrowLeft, CheckCircle, XCircle, GitBranch,
  CheckSquare, Flag, MessageSquare, User, Building2, Calendar, Hash, FileCheck,
  Link, Pencil, X, Check, Ban, Send
} from 'lucide-react'
import { CMWorkflowStage, DepartmentSlug, UserRole } from '@/types/enums'
import type { CMWithSteps } from '@/types/domain'
import { useUpdateCMExtraFields } from '@/hooks/useUpdateCMExtraFields'

const DEPT_COLORS: Record<string, { bg: string; color: string }> = {
  vendas:        { bg: '#eff6ff', color: '#1d4ed8' },
  eng_projetos:  { bg: '#f5f3ff', color: '#6d28d9' },
  qualidade:     { bg: '#f0fdf4', color: '#15803d' },
  planejamento:  { bg: '#ecfeff', color: '#0e7490' },
  suprimentos:   { bg: '#fff7ed', color: '#c2410c' },
  eng_processos: { bg: '#fdf2f8', color: '#be185d' },
  custos:        { bg: '#fffbeb', color: '#b45309' },
  pricing:       { bg: '#fff1f2', color: '#be123c' },
}

const ACTION_CONFIG: Record<string, { bg: string; label: string }> = {
  created:              { bg: '#2563eb', label: 'C' },
  forwarded:            { bg: '#7c3aed', label: 'E' },
  returned:             { bg: '#d97706', label: 'R' },
  approved:             { bg: '#16a34a', label: '✓' },
  refused:              { bg: '#dc2626', label: '✗' },
  dispatched_parallel:  { bg: '#7c3aed', label: '⑃' },
  jumped:               { bg: '#7c3aed', label: '↗' },
  contested:            { bg: '#ea580c', label: '⚑' },
  contest_response:     { bg: '#0891b2', label: '↩' },
  finalized:            { bg: '#16a34a', label: 'F' },
  auto_finalized:       { bg: '#64748b', label: '⏱' },
  cancelled:            { bg: '#64748b', label: '⊘' },
}

const ACTION_LABEL: Record<string, string> = {
  created:             'Consulta criada',
  forwarded:           'Encaminhada',
  returned:            'Retornada',
  approved:            'Aprovada',
  refused:             'Recusada',
  dispatched_parallel: 'Análise paralela iniciada',
  jumped:              'Pulo de etapa',
  contested:           'Etapa contestada por Vendas',
  contest_response:    'Resposta à contestação',
  finalized:           'Finalizada',
  auto_finalized:      'Finalizado pelo sistema',
  cancelled:           'Cancelada pelo criador',
}

// Suggested flow steps keyed by dept slug (null = parallel step)
interface WorkflowStep {
  slug: string | null
  label: string
  shortLabel: string
}

const NEW_ITEM_FLOW: WorkflowStep[] = [
  { slug: 'eng_projetos',  label: 'Eng. de Projetos',      shortLabel: 'PJ'  },
  { slug: 'suprimentos',   label: 'Suprimentos',            shortLabel: 'SUP' },
  { slug: null,            label: 'Análise Paralela',       shortLabel: 'PAR' },
  { slug: 'custos',        label: 'Custos',                 shortLabel: 'CUS' },
  { slug: 'pricing',       label: 'Pricing',                shortLabel: 'PRI' },
  { slug: 'vendas',        label: 'Finalização em Vendas',  shortLabel: 'VEN' },
]

const EXISTING_ITEM_FLOW: WorkflowStep[] = [
  { slug: 'pricing',   label: 'Pricing',               shortLabel: 'P1'  },
  { slug: 'custos',    label: 'Custos',                 shortLabel: 'CUS' },
  { slug: null,        label: 'Análise Paralela',       shortLabel: 'PAR' },
  { slug: 'pricing',   label: 'Pricing',                shortLabel: 'P2'  },
  { slug: 'vendas',    label: 'Finalização em Vendas',  shortLabel: 'VEN' },
]

function getCurrentFlowIndex(cm: CMWithSteps, flow: WorkflowStep[]): number {
  if (cm.workflow_stage === CMWorkflowStage.Parallel) {
    return flow.findIndex(s => s.slug === null)
  }
  if (cm.workflow_stage === CMWorkflowStage.VendasFinalize || cm.workflow_stage === CMWorkflowStage.Finalized) {
    return flow.findIndex(s => s.slug === 'vendas')
  }
  if (cm.workflow_stage === CMWorkflowStage.Open && cm.current_department) {
    return flow.findIndex(s => s.slug === cm.current_department!.slug)
  }
  if (cm.workflow_stage === CMWorkflowStage.Refused && cm.pre_refusal_stage) {
    // Show where it was before being refused
    if (cm.pre_refusal_stage === CMWorkflowStage.Parallel) return flow.findIndex(s => s.slug === null)
    if (cm.pre_refusal_stage === CMWorkflowStage.VendasFinalize) return flow.findIndex(s => s.slug === 'vendas')
  }
  return -1
}

function WorkflowMap({ cm }: { cm: CMWithSteps }) {
  const flow = cm.is_new_item ? NEW_ITEM_FLOW : EXISTING_ITEM_FLOW
  const currentIndex = getCurrentFlowIndex(cm, flow)
  const isFinalized = cm.workflow_stage === CMWorkflowStage.Finalized
  const isRefused   = cm.workflow_stage === CMWorkflowStage.Refused
  const isContested = cm.workflow_stage === CMWorkflowStage.Contested
  const isCancelled = cm.workflow_stage === CMWorkflowStage.Cancelled

  let statusLabel = ''
  let statusColor = '#1d4ed8'
  let statusBg    = '#eff6ff'
  let statusBorder = '#bfdbfe'

  if (isFinalized) { statusLabel = 'Finalizada'; statusColor = '#15803d'; statusBg = '#f0fdf4'; statusBorder = '#bbf7d0' }
  else if (isCancelled) { statusLabel = 'Cancelada'; statusColor = '#475569'; statusBg = '#f1f5f9'; statusBorder = '#e2e8f0' }
  else if (isRefused) { statusLabel = 'Recusada'; statusColor = '#b91c1c'; statusBg = '#fef2f2'; statusBorder = '#fecaca' }
  else if (isContested) { statusLabel = 'Contestação em andamento'; statusColor = '#c2410c'; statusBg = '#fff7ed'; statusBorder = '#fed7aa' }
  else if (cm.workflow_stage === CMWorkflowStage.Parallel) { statusLabel = 'Análise paralela'; statusColor = '#6d28d9'; statusBg = '#f5f3ff'; statusBorder = '#ddd6fe' }
  else if (cm.workflow_stage === CMWorkflowStage.VendasFinalize) { statusLabel = 'Aguardando finalização'; statusColor = '#1d4ed8'; statusBg = '#eff6ff'; statusBorder = '#bfdbfe' }
  else if (cm.current_department) { statusLabel = cm.current_department.name; statusColor = '#1d4ed8'; statusBg = '#eff6ff'; statusBorder = '#bfdbfe' }

  const flowLabel = cm.is_new_item ? 'Item Novo' : 'Item Existente'

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Fluxo Sugerido</h2>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>— referência, encaminhamento é livre</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 999, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
            {flowLabel}
          </span>
          {statusLabel && (
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 999, border: `1px solid ${statusBorder}`, backgroundColor: statusBg, color: statusColor }}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', marginTop: '0.875rem', paddingBottom: '0.25rem' }}>
        {flow.map((step, index) => {
          const isDone   = isFinalized || (currentIndex >= 0 && index < currentIndex)
          const isActive = currentIndex >= 0 && index === currentIndex
          const circleBg     = isDone ? '#16a34a' : isActive ? (isRefused ? '#dc2626' : '#2563eb') : '#fff'
          const circleBorder = isDone || isActive ? 'transparent' : '#cbd5e1'
          const circleColor  = isDone || isActive ? '#fff' : '#94a3b8'
          const textColor    = isActive ? '#0f172a' : isDone ? '#166534' : '#64748b'
          const connectorColor = isDone || (isFinalized && index < flow.length - 1) ? '#86efac' : '#e2e8f0'

          return (
            <div key={`${step.slug ?? 'par'}-${index}`} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 86, textAlign: 'center' }}>
                <div style={{
                  width: 34, height: 34, margin: '0 auto', borderRadius: '50%',
                  border: `1px solid ${circleBorder}`, backgroundColor: circleBg, color: circleColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.14)' : 'none',
                }}>
                  {isDone ? '✓' : step.shortLabel}
                </div>
                <p style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.25, color: textColor }}>{step.label}</p>
              </div>
              {index < flow.length - 1 && (
                <div style={{ width: 30, height: 3, borderRadius: 999, backgroundColor: connectorColor, margin: '0 0.2rem', marginTop: 16 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Icon size={11} style={{ color: '#94a3b8' }} />
        <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      </div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{value}</p>
    </div>
  )
}

function ParallelBranchStatus({ cm }: { cm: CMWithSteps }) {
  const branches = cm.parallel_branches ?? []
  if (branches.length === 0) return null

  const statusColor = { pending: '#d97706', approved: '#16a34a', refused: '#dc2626' }
  const statusLabel = { pending: 'Aguardando', approved: 'Aprovado', refused: 'Recusado' }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>Análise Paralela</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {branches.map(branch => (
          <div key={branch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
              {branch.department?.name ?? branch.dept_id}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[branch.status] }}>
              {statusLabel[branch.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CMExtraFields({ cm, isVendas }: { cm: CMWithSteps; isVendas: boolean }) {
  const updateMutation = useUpdateCMExtraFields()
  const [editing, setEditing] = useState(false)
  const [internalId, setInternalId] = useState(cm.internal_id ?? '')
  const [analysisUrl, setAnalysisUrl] = useState(cm.critical_analysis_url ?? '')

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      cmId: cm.id,
      cmNumber: cm.number,
      internalId: internalId || null,
      criticalAnalysisUrl: analysisUrl || null,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setInternalId(cm.internal_id ?? '')
    setAnalysisUrl(cm.critical_analysis_url ?? '')
    setEditing(false)
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Informações Adicionais</h2>
        {isVendas && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ padding: '0.25rem 0.375rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'color 0.15s, background-color 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.backgroundColor = '#f8fafc' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: '0.3rem' }}>
              <Hash size={11} style={{ color: '#94a3b8' }} />
              Código de identificação
            </label>
            <input
              value={internalId}
              onChange={(e) => setInternalId(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 0.75rem', fontSize: 13, fontFamily: 'inherit', color: '#0f172a', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: '0.3rem' }}>
              <Link size={11} style={{ color: '#94a3b8' }} />
              URL da Análise Crítica
            </label>
            <input
              type="url"
              value={analysisUrl}
              onChange={(e) => setAnalysisUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', height: 34, padding: '0 0.75rem', fontSize: 13, fontFamily: 'inherit', color: '#0f172a', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button onClick={handleCancel} disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', fontSize: 12, fontWeight: 500, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={12} />Cancelar
            </button>
            <button onClick={handleSave} disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', fontSize: 12, fontWeight: 500, borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: updateMutation.isPending ? 0.7 : 1 }}>
              <Check size={12} />Salvar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Hash size={11} style={{ color: '#94a3b8' }} />
              <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Código de identificação</p>
            </div>
            {cm.internal_id
              ? <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{cm.internal_id}</p>
              : <p style={{ fontSize: 12.5, color: '#cbd5e1', fontStyle: 'italic' }}>Não informado</p>
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Link size={11} style={{ color: '#94a3b8' }} />
              <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Análise Crítica</p>
            </div>
            {cm.critical_analysis_url
              ? (
                <a href={cm.critical_analysis_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
                  Abrir documento
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )
              : <p style={{ fontSize: 12.5, color: '#cbd5e1', fontStyle: 'italic' }}>URL não informada</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}

export function CMDetailPage() {
  const { number }  = useParams<{ number: string }>()
  const navigate    = useNavigate()
  const { profile } = useAuth()
  const { data: cm, isLoading } = useCM(number || '')

  const [showApprove,          setShowApprove]          = useState(false)
  const [showRefuse,           setShowRefuse]            = useState(false)
  const [showApproveParallel,  setShowApproveParallel]   = useState(false)
  const [showRefuseParallel,   setShowRefuseParallel]    = useState(false)
  const [showDispatchParallel, setShowDispatchParallel]  = useState(false)
  const [showFinalize,         setShowFinalize]          = useState(false)
  const [showForwardFinalize,  setShowForwardFinalize]   = useState(false)
  const [showContest,          setShowContest]           = useState(false)
  const [showRespondToContest, setShowRespondToContest]  = useState(false)
  const [showCancel,           setShowCancel]            = useState(false)

  if (!number) return <NotFound />

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!cm) return <NotFound />

  const isOpen   = cm.status === 'open'
  const mySlug   = profile?.department?.slug
  const myDeptId = profile?.department_id
  const stage    = cm.workflow_stage

  const myPendingBranch = (cm.parallel_branches ?? []).find(
    b => b.dept_id === myDeptId && b.status === 'pending'
  )

  const iHoldTheCM = isOpen && myDeptId != null && cm.current_dept_id === myDeptId

  const actions = {
    // Any dept except Vendas can approve/refuse only at open stage (not at finalization)
    canApprove: iHoldTheCM && stage === CMWorkflowStage.Open && mySlug !== DepartmentSlug.Vendas,
    canRefuse:  iHoldTheCM && stage === CMWorkflowStage.Open && mySlug !== DepartmentSlug.Vendas,

    // Any dept currently holding the CM at open stage can dispatch parallel
    canDispatchParallel: iHoldTheCM && stage === CMWorkflowStage.Open,

    // Parallel branch actions
    canApproveParallel: isOpen && !!myPendingBranch,
    canRefuseParallel:  isOpen && !!myPendingBranch,

    // Whoever holds the CM at vendas_finalize stage finalizes it (Vendas or creator's dept)
    canFinalize: iHoldTheCM && stage === CMWorkflowStage.VendasFinalize,

    // Vendas can contest at vendas_finalize or when CM is refused
    canContest: mySlug === DepartmentSlug.Vendas && (
      (isOpen && stage === CMWorkflowStage.VendasFinalize) ||
      stage === CMWorkflowStage.Refused
    ),

    // Vendas can forward to a missing dept instead of finalizing, if the CM
    // reached them before every needed dept had a chance to weigh in
    canForwardFinalize: iHoldTheCM && stage === CMWorkflowStage.VendasFinalize && mySlug === DepartmentSlug.Vendas,

    // Dept that was contested responds
    canRespondToContest: isOpen && stage === CMWorkflowStage.Contested && myDeptId === cm.current_dept_id,

    // Creator (or an admin) can cancel the CM while it is still open
    canCancel: isOpen && (profile?.id === cm.created_by || profile?.role === UserRole.Admin),
  }

  const hasAnyAction = Object.values(actions).some(Boolean)

  const deptSlug  = cm.current_department?.slug || ''
  const deptStyle = DEPT_COLORS[deptSlug] || { bg: '#f8fafc', color: '#475569' }

  const isParallelStage = stage === CMWorkflowStage.Parallel

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '0.375rem', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', flexShrink: 0, marginTop: 2, transition: 'background-color 0.15s, color 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>{cm.number}</span>
            <CMStatusBadge status={cm.status} />
            {isParallelStage ? (
              <span style={{ fontSize: 11.5, fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: 6, backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
                Análise Paralela em andamento
              </span>
            ) : cm.current_department && (
              <span style={{ fontSize: 11.5, fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: 6, backgroundColor: deptStyle.bg, color: deptStyle.color }}>
                {cm.current_department.name}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{cm.title}</h1>
        </div>
      </div>

      <WorkflowMap cm={cm} />

      {/* Actions bar */}
      {(isOpen || actions.canContest) && hasAnyAction && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', flex: 1 }}>Ações disponíveis:</span>

          {actions.canApprove && (
            <Button variant="success" size="sm" onClick={() => setShowApprove(true)}>
              <CheckCircle size={13} />
              Aprovar
            </Button>
          )}
          {actions.canRefuse && (
            <Button variant="danger" size="sm" onClick={() => setShowRefuse(true)}>
              <XCircle size={13} />
              Recusar
            </Button>
          )}

          {actions.canApproveParallel && (
            <Button variant="success" size="sm" onClick={() => setShowApproveParallel(true)}>
              <CheckCircle size={13} />
              Aprovar
            </Button>
          )}
          {actions.canRefuseParallel && (
            <Button variant="danger" size="sm" onClick={() => setShowRefuseParallel(true)}>
              <XCircle size={13} />
              Recusar
            </Button>
          )}

          {actions.canDispatchParallel && (
            <Button variant="secondary" size="sm" onClick={() => setShowDispatchParallel(true)}>
              <GitBranch size={13} />
              Análise Paralela
            </Button>
          )}

          {actions.canFinalize && (
            <Button size="sm" onClick={() => setShowFinalize(true)}>
              <CheckSquare size={13} />
              Finalizar CM
            </Button>
          )}
          {actions.canContest && (
            <Button variant="secondary" size="sm" onClick={() => setShowContest(true)}>
              <Flag size={13} />
              Contestar Etapa
            </Button>
          )}
          {actions.canForwardFinalize && (
            <Button variant="secondary" size="sm" onClick={() => setShowForwardFinalize(true)}>
              <Send size={13} />
              Encaminhar para Depto.
            </Button>
          )}

          {actions.canRespondToContest && (
            <Button variant="secondary" size="sm" onClick={() => setShowRespondToContest(true)}>
              <MessageSquare size={13} />
              Responder Contestação
            </Button>
          )}

          {actions.canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', fontSize: 12.5, fontWeight: 500, borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', transition: 'background-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
            >
              <Ban size={13} />
              Cancelar CM
            </button>
          )}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>Descrição</h2>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{cm.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.25rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <InfoField icon={User}      label="Criado por"         value={cm.creator?.full_name || '-'} />
              <InfoField icon={Building2} label="Departamento atual" value={isParallelStage ? 'Análise Paralela' : (cm.current_department?.name || '-')} />
              <InfoField icon={Calendar}  label="Criado em"          value={new Date(cm.created_at).toLocaleDateString('pt-BR')} />
              {cm.ov_number && <InfoField icon={Hash} label="Número OV" value={cm.ov_number} />}
            </div>

            {/* Contestation notice */}
            {stage === CMWorkflowStage.Contested && cm.contest_reason && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                  <Flag size={14} style={{ color: '#ea580c' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Etapa Contestada por Vendas</h3>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>"{cm.contest_reason}"</p>
              </div>
            )}

            {/* Finalization result */}
            {cm.status !== 'open' && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                {cm.status === 'closed_by_system' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>⏱</span>
                    <span style={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic' }}>
                      Finalizado automaticamente pelo sistema após 5 dias sem movimentação
                    </span>
                  </div>
                ) : cm.status === 'cancelled' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: cm.finalization_notes ? '0.5rem' : 0 }}>
                      <Ban size={15} style={{ color: '#64748b' }} />
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>CM cancelada pelo criador</h3>
                    </div>
                    {cm.finalization_notes && (
                      <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>"{cm.finalization_notes}"</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.625rem' }}>
                      <FileCheck size={15} style={{ color: cm.viability ? '#16a34a' : '#dc2626' }} />
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Resultado</h3>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '0.15rem 0.6rem', borderRadius: 999, backgroundColor: cm.viability ? '#dcfce7' : '#fee2e2', color: cm.viability ? '#15803d' : '#dc2626' }}>
                        {cm.viability ? 'Viável' : 'Não Viável'}
                      </span>
                    </div>
                    {cm.finalization_notes && (
                      <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>"{cm.finalization_notes}"</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {(cm.parallel_branches ?? []).length > 0 && <ParallelBranchStatus cm={cm} />}

          {/* Timeline */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '1.25rem' }}>Histórico</h2>
            {cm.steps && cm.steps.length > 0 ? (
              <div>
                {cm.steps.map((step, i) => {
                  const cfg    = ACTION_CONFIG[step.action] || { bg: '#64748b', label: '?' }
                  const label  = ACTION_LABEL[step.action] || step.action
                  const isLast = i === cm.steps!.length - 1
                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: cfg.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {cfg.label}
                        </div>
                        {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: '#f1f5f9', margin: '4px 0' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.125rem' }}>
                        <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0f172a', lineHeight: 1.4 }}>
                          {label}
                          {step.to_department && ['forwarded', 'approved', 'jumped', 'contested', 'contest_response'].includes(step.action) && step.from_dept_id !== step.to_dept_id && (
                            <> para <strong>{step.to_department.name}</strong></>
                          )}
                        </p>
                        {step.notes && (
                          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontStyle: 'italic' }}>"{step.notes}"</p>
                        )}
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          por <span style={{ fontWeight: 500, color: '#64748b' }}>{step.actor?.full_name ?? 'Sistema'}</span>
                          {' · '}
                          {new Date(step.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#64748b' }}>Nenhum passo registrado</p>
            )}
          </div>
        </div>

        {profile && (
          <div style={{ flex: '0 0 40%', minWidth: 0, position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AttachmentsSection cmId={cm.id} profile={profile} />
            <CMExtraFields cm={cm} isVendas={mySlug === DepartmentSlug.Vendas} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showApprove          && profile && <ApproveModal cm={cm} actorId={profile.id} onClose={() => setShowApprove(false)} />}
      {showRefuse           && profile && <RefuseModal  cm={cm} actorId={profile.id} onClose={() => setShowRefuse(false)} />}
      {showApproveParallel  && profile && <ApproveModal cm={cm} actorId={profile.id} isParallel onClose={() => setShowApproveParallel(false)} />}
      {showRefuseParallel   && profile && <RefuseModal  cm={cm} actorId={profile.id} isParallel onClose={() => setShowRefuseParallel(false)} />}
      {showDispatchParallel && profile && <DispatchParallelExistingModal cm={cm} actorId={profile.id} onClose={() => setShowDispatchParallel(false)} />}
      {showFinalize         && profile && <FinalizeModal cm={cm} actorId={profile.id} onClose={() => setShowFinalize(false)} />}
      {showForwardFinalize  && profile && <ApproveModal cm={cm} actorId={profile.id} title="Encaminhar" onClose={() => setShowForwardFinalize(false)} />}
      {showContest          && profile && <ContestModal  cm={cm} actorId={profile.id} onClose={() => setShowContest(false)} />}
      {showRespondToContest && profile && <RespondToContestModal cm={cm} actorId={profile.id} onClose={() => setShowRespondToContest(false)} />}
      {showCancel           && profile && <CancelModal   cm={cm} actorId={profile.id} onClose={() => setShowCancel(false)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', textAlign: 'center' }}>
      <AlertCircle size={36} style={{ color: '#fca5a5', marginBottom: '0.75rem' }} />
      <p style={{ fontSize: 15, fontWeight: 500, color: '#0f172a' }}>CM não encontrada</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: '0.75rem', fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
        Voltar
      </button>
    </div>
  )
}
