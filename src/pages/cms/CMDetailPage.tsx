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
import { AttachmentsSection } from '@/components/cm/AttachmentsSection'
import {
  AlertCircle, ArrowLeft, CheckCircle, XCircle, GitBranch,
  CheckSquare, Flag, MessageSquare, User, Building2, Calendar, Hash, FileCheck,
  Link, Pencil, X, Check
} from 'lucide-react'
import { CMWorkflowStage, DepartmentSlug } from '@/types/enums'
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
  contested:            { bg: '#ea580c', label: '⚑' },
  contest_response:     { bg: '#0891b2', label: '↩' },
  finalized:            { bg: '#16a34a', label: 'F' },
}

const ACTION_LABEL: Record<string, string> = {
  created:             'Consulta criada',
  forwarded:           'Encaminhada',
  returned:            'Retornada',
  approved:            'Aprovada',
  refused:             'Recusada',
  dispatched_parallel: 'Análise paralela iniciada',
  contested:           'Etapa contestada por Vendas',
  contest_response:    'Resposta à contestação',
  finalized:           'Finalizada',
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

// ── CM Extra Fields (internal_id + critical_analysis_url) ───────
function CMExtraFields({ cm, isVendas }: { cm: CMWithSteps; isVendas: boolean }) {
  const updateMutation = useUpdateCMExtraFields()
  const [editing, setEditing] = useState(false)
  const [internalId, setInternalId] = useState(cm.internal_id ?? '')
  const [analysisUrl, setAnalysisUrl] = useState(cm.critical_analysis_url ?? '')

  const hasContent = cm.internal_id || cm.critical_analysis_url

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
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
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
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', fontSize: 12, fontWeight: 500, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <X size={12} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', fontSize: 12, fontWeight: 500, borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: updateMutation.isPending ? 0.7 : 1 }}
            >
              <Check size={12} />
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cm.internal_id ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <Hash size={11} style={{ color: '#94a3b8' }} />
                <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Código de identificação</p>
              </div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{cm.internal_id}</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <Hash size={11} style={{ color: '#94a3b8' }} />
                <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Código de identificação</p>
              </div>
              <p style={{ fontSize: 12.5, color: '#cbd5e1', fontStyle: 'italic' }}>Não informado</p>
            </div>
          )}

          {cm.critical_analysis_url ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <Link size={11} style={{ color: '#94a3b8' }} />
                <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Análise Crítica</p>
              </div>
              <a
                href={cm.critical_analysis_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Abrir documento
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <Link size={11} style={{ color: '#94a3b8' }} />
                <p style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Análise Crítica</p>
              </div>
              <p style={{ fontSize: 12.5, color: '#cbd5e1', fontStyle: 'italic' }}>URL não informada</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CMDetailPage() {
  const { number }   = useParams<{ number: string }>()
  const navigate     = useNavigate()
  const { profile }  = useAuth()
  const { data: cm, isLoading } = useCM(number || '')

  const [showApprove,           setShowApprove]           = useState(false)
  const [showRefuse,            setShowRefuse]            = useState(false)
  const [showApproveParallel,   setShowApproveParallel]   = useState(false)
  const [showRefuseParallel,    setShowRefuseParallel]    = useState(false)
  const [showDispatchParallel,  setShowDispatchParallel]  = useState(false)
  const [showFinalize,          setShowFinalize]          = useState(false)
  const [showContest,           setShowContest]           = useState(false)
  const [showRespondToContest,  setShowRespondToContest]  = useState(false)

  if (!number) return <NotFound />

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!cm) return <NotFound />

  const isOpen       = cm.status === 'open'
  const mySlug       = profile?.department?.slug
  const myDeptId     = profile?.department_id
  const stage        = cm.workflow_stage

  const myPendingBranch = (cm.parallel_branches ?? []).find(
    b => b.dept_id === myDeptId && b.status === 'pending'
  )

  const actions = {
    canApprove: isOpen && (
      (stage === CMWorkflowStage.NewItemProjetos    && mySlug === DepartmentSlug.EngProjetos) ||
      (stage === CMWorkflowStage.NewItemSuprimentos && mySlug === DepartmentSlug.Suprimentos) ||
      (stage === CMWorkflowStage.NewItemCustos      && mySlug === DepartmentSlug.Custos) ||
      (stage === CMWorkflowStage.NewItemPricing     && mySlug === DepartmentSlug.Pricing) ||
      (stage === CMWorkflowStage.ExistingPricing1   && mySlug === DepartmentSlug.Pricing) ||
      // ExistingCustos (1ª passagem) não tem approve — custos obrigatoriamente usa dispatch paralelo
      (stage === CMWorkflowStage.ExistingCustos2    && mySlug === DepartmentSlug.Custos) ||
      (stage === CMWorkflowStage.ExistingPricing2   && mySlug === DepartmentSlug.Pricing)
    ),
    canRefuse: isOpen && (
      (stage === CMWorkflowStage.NewItemProjetos    && mySlug === DepartmentSlug.EngProjetos) ||
      (stage === CMWorkflowStage.NewItemSuprimentos && mySlug === DepartmentSlug.Suprimentos) ||
      (stage === CMWorkflowStage.NewItemCustos      && mySlug === DepartmentSlug.Custos) ||
      (stage === CMWorkflowStage.NewItemPricing     && mySlug === DepartmentSlug.Pricing) ||
      (stage === CMWorkflowStage.ExistingPricing1   && mySlug === DepartmentSlug.Pricing) ||
      (stage === CMWorkflowStage.ExistingCustos     && mySlug === DepartmentSlug.Custos) ||
      (stage === CMWorkflowStage.ExistingCustos2    && mySlug === DepartmentSlug.Custos) ||
      (stage === CMWorkflowStage.ExistingPricing2   && mySlug === DepartmentSlug.Pricing)
    ),
    canDispatchParallelExisting: isOpen && stage === CMWorkflowStage.ExistingCustos && mySlug === DepartmentSlug.Custos,
    canApproveParallel: isOpen && !!myPendingBranch,
    canRefuseParallel:  isOpen && !!myPendingBranch,
    canFinalize:  isOpen && stage === CMWorkflowStage.VendasFinalize && mySlug === DepartmentSlug.Vendas,
    canContest:   mySlug === DepartmentSlug.Vendas && (
                    (isOpen && stage === CMWorkflowStage.VendasFinalize) ||
                    stage === CMWorkflowStage.Refused
                  ),
    canRespondToContest: isOpen && stage === CMWorkflowStage.Contestation && myDeptId === cm.current_dept_id,
  }

  const hasAnyAction = Object.values(actions).some(Boolean)

  const deptSlug  = cm.current_department?.slug || ''
  const deptStyle = DEPT_COLORS[deptSlug] || { bg: '#f8fafc', color: '#475569' }

  const isParallelStage = stage === CMWorkflowStage.NewItemParallel || stage === CMWorkflowStage.ExistingParallel

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

      {/* Actions bar */}
      {(isOpen || actions.canContest) && hasAnyAction && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '0.875rem 1.125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', flex: 1 }}>Ações disponíveis:</span>

          {/* Sequential approve/refuse */}
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

          {/* Parallel approve/refuse */}
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

          {/* Custos: dispatch parallel */}
          {actions.canDispatchParallelExisting && (
            <Button variant="secondary" size="sm" onClick={() => setShowDispatchParallel(true)}>
              <GitBranch size={13} />
              Análise Paralela
            </Button>
          )}

          {/* Vendas: finalize & contest */}
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

          {/* Contested dept: respond */}
          {actions.canRespondToContest && (
            <Button variant="secondary" size="sm" onClick={() => setShowRespondToContest(true)}>
              <MessageSquare size={13} />
              Responder Contestação
            </Button>
          )}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* Left column */}
        <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Main info card */}
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
            {stage === CMWorkflowStage.Contestation && cm.contest_reason && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.625rem' }}>
                  <FileCheck size={15} style={{ color: cm.viability ? '#16a34a' : '#dc2626' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Resultado</h3>
                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '0.15rem 0.6rem',
                    borderRadius: 999,
                    backgroundColor: cm.viability ? '#dcfce7' : '#fee2e2',
                    color: cm.viability ? '#15803d' : '#dc2626',
                  }}>
                    {cm.viability ? 'Viável' : 'Não Viável'}
                  </span>
                </div>
                {cm.finalization_notes && (
                  <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>"{cm.finalization_notes}"</p>
                )}
              </div>
            )}
          </div>

          {/* Parallel branch status */}
          {(cm.parallel_branches ?? []).length > 0 && (
            <ParallelBranchStatus cm={cm} />
          )}

          {/* Timeline */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '1.25rem' }}>Histórico</h2>

            {cm.steps && cm.steps.length > 0 ? (
              <div>
                {cm.steps.map((step, i) => {
                  const cfg   = ACTION_CONFIG[step.action] || { bg: '#64748b', label: '?' }
                  const label = ACTION_LABEL[step.action] || step.action
                  const isLast = i === cm.steps!.length - 1
                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '0.875rem' }}>
                      {/* Icon + line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          backgroundColor: cfg.bg, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {cfg.label}
                        </div>
                        {!isLast && (
                          <div style={{ width: 1, flex: 1, backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.125rem' }}>
                        <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0f172a', lineHeight: 1.4 }}>
                          {label}
                          {step.to_department && ['forwarded', 'approved', 'contested', 'contest_response'].includes(step.action) && step.from_dept_id !== step.to_dept_id && (
                            <> para <strong>{step.to_department.name}</strong></>
                          )}
                        </p>
                        {step.notes && (
                          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontStyle: 'italic' }}>"{step.notes}"</p>
                        )}
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          por <span style={{ fontWeight: 500, color: '#64748b' }}>{step.actor?.full_name}</span>
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

        {/* Right column — attachments + extra fields */}
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
      {showContest          && profile && <ContestModal  cm={cm} actorId={profile.id} onClose={() => setShowContest(false)} />}
      {showRespondToContest && profile && <RespondToContestModal cm={cm} actorId={profile.id} onClose={() => setShowRespondToContest(false)} />}

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
