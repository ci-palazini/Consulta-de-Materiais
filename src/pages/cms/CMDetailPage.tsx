import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCM } from '@/hooks/useCM'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { CMStatusBadge } from '@/components/cm/CMStatusBadge'
import { ForwardModal } from '@/components/cm/ForwardModal'
import { FinalizeModal } from '@/components/cm/FinalizeModal'
import { AlertCircle, ArrowLeft, Send, CheckSquare, User, Building2, Calendar, Hash, FileCheck } from 'lucide-react'
import { AttachmentsSection } from '@/components/cm/AttachmentsSection'

const DEPT_COLORS: Record<string, { bg: string; color: string }> = {
  vendas:        { bg: '#eff6ff', color: '#1d4ed8' },
  eng_aplicacao: { bg: '#f5f3ff', color: '#6d28d9' },
  eng_produto:   { bg: '#eef2ff', color: '#4338ca' },
  qualidade:     { bg: '#f0fdf4', color: '#15803d' },
  planejamento:  { bg: '#ecfeff', color: '#0e7490' },
  suprimentos:   { bg: '#fff7ed', color: '#c2410c' },
  eng_processos: { bg: '#fdf2f8', color: '#be185d' },
  custos:        { bg: '#fffbeb', color: '#b45309' },
  pricing:       { bg: '#fff1f2', color: '#be123c' },
}

const ACTION_CONFIG: Record<string, { bg: string; label: string }> = {
  created:   { bg: '#2563eb', label: 'C' },
  forwarded: { bg: '#7c3aed', label: 'E' },
  returned:  { bg: '#d97706', label: 'R' },
  finalized: { bg: '#16a34a', label: 'F' },
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

export function CMDetailPage() {
  const { number }  = useParams<{ number: string }>()
  const navigate   = useNavigate()
  const { profile } = useAuth()
  const { data: cm, isLoading } = useCM(number || '')

  const [showForward,  setShowForward]  = useState(false)
  const [showFinalize, setShowFinalize] = useState(false)

  if (!number) return <NotFound />

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!cm) return <NotFound />

  const isOpen          = cm.status === 'open'
  const isMyDept        = profile?.department_id === cm.current_dept_id
  const isVendas        = profile?.department?.slug === 'vendas'
  const hasBeenForwarded = cm.steps?.some(s => s.action === 'forwarded') ?? false
  const canForward       = isOpen && isMyDept
  const canFinalize      = isOpen && isVendas && isMyDept && hasBeenForwarded

  const deptSlug  = cm.current_department?.slug || ''
  const deptStyle = DEPT_COLORS[deptSlug] || { bg: '#f8fafc', color: '#475569' }

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
            {cm.current_department && (
              <span style={{ fontSize: 11.5, fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: 6, backgroundColor: deptStyle.bg, color: deptStyle.color }}>
                {cm.current_department.name}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{cm.title}</h1>
        </div>
      </div>

      {/* Actions bar */}
      {isOpen && (canForward || canFinalize) && (
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
          {canForward && (
            <Button variant="secondary" size="sm" onClick={() => setShowForward(true)}>
              <Send size={13} />
              Encaminhar
            </Button>
          )}
          {canFinalize && (
            <Button size="sm" onClick={() => setShowFinalize(true)}>
              <CheckSquare size={13} />
              Finalizar CM
            </Button>
          )}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* Left column — info + timeline */}
        <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Main info card */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>Descrição</h2>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{cm.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.25rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <InfoField icon={User}      label="Criado por"         value={cm.creator?.full_name || '-'} />
              <InfoField icon={Building2} label="Departamento atual" value={cm.current_department?.name || '-'} />
              <InfoField icon={Calendar}  label="Criado em"          value={new Date(cm.created_at).toLocaleDateString('pt-BR')} />
              {cm.ov_number && <InfoField icon={Hash} label="Número OV" value={cm.ov_number} />}
            </div>

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

          {/* Timeline */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: '1.25rem' }}>Histórico</h2>

            {cm.steps && cm.steps.length > 0 ? (
              <div>
                {cm.steps.map((step, i) => {
                  const cfg = ACTION_CONFIG[step.action] || { bg: '#64748b', label: '?' }
                  const isLast = i === cm.steps!.length - 1
                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '0.875rem' }}>
                      {/* Icon + line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          backgroundColor: cfg.bg,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
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
                          {step.action === 'created'   && 'Consulta criada'}
                          {step.action === 'forwarded' && <>Encaminhada para <strong>{step.to_department?.name}</strong></>}
                          {step.action === 'returned'  && <>Retornada para <strong>{step.to_department?.name}</strong></>}
                          {step.action === 'finalized' && 'Finalizada'}
                          {!['created','forwarded','returned','finalized'].includes(step.action) && step.action}
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

        {/* Right column — attachments (sticky) */}
        {profile && (
          <div style={{ flex: '0 0 40%', minWidth: 0, position: 'sticky', top: '1rem' }}>
            <AttachmentsSection cmId={cm.id} profile={profile} />
          </div>
        )}

      </div>

      {showForward  && profile && <ForwardModal  cm={cm} actorId={profile.id} onClose={() => setShowForward(false)} />}
      {showFinalize && profile && <FinalizeModal cm={cm} actorId={profile.id} onClose={() => setShowFinalize(false)} />}

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
