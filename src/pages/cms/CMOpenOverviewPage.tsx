import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Inbox } from 'lucide-react'
import { useOpenCMsOverview } from '@/hooks/useOpenCMsOverview'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatElapsed(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

function getStageLabel(workflowStage: string) {
  switch (workflowStage) {
    case 'parallel':
      return { label: 'Paralela', bg: '#f5f3ff', color: '#6d28d9' }
    case 'vendas_finalize':
      return { label: 'Finalização', bg: '#eff6ff', color: '#1d4ed8' }
    case 'contested':
      return { label: 'Contestada', bg: '#fff7ed', color: '#c2410c' }
    case 'open':
    default:
      return { label: 'Em fluxo', bg: '#f8fafc', color: '#475569' }
  }
}

export function CMOpenOverviewPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useOpenCMsOverview()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []

    return (data ?? []).filter((cm) =>
      cm.number.toLowerCase().includes(q)
      || cm.title.toLowerCase().includes(q)
      || cm.description.toLowerCase().includes(q)
      || cm.currentQueue.toLowerCase().includes(q)
      || cm.requestedBy.toLowerCase().includes(q)
      || (cm.internalId?.toLowerCase().includes(q) ?? false),
    )
  }, [data, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Visão Rápida das Consultas Abertas
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {(data ?? []).length} consulta{(data ?? []).length !== 1 ? 's' : ''} aberta{(data ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '0.875rem 1rem',
      }}>
        <div style={{ position: 'relative', maxWidth: 460 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por CM, título, departamento, solicitante ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              fontFamily: 'inherit',
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb'
              e.target.style.backgroundColor = '#fff'
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0'
              e.target.style.backgroundColor = '#f8fafc'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="animate-pulse"
              style={{ height: 56, borderBottom: row !== 6 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#fff' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '3rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Inbox size={20} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {(data ?? []).length === 0 ? 'Nenhuma consulta aberta no momento' : 'Nenhuma consulta encontrada com esse filtro'}
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'auto',
        }}>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>CM</th>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Solicitante</th>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Departamento / Etapa</th>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Com depto desde</th>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>CM aberta em</th>
                <th style={{ textAlign: 'left', padding: '0.7rem 0.9rem', fontSize: 11.5, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Tempo aberto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cm) => {
                const stage = getStageLabel(cm.workflowStage)
                return (
                  <tr
                    key={cm.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/cms/${cm.number}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/cms/${cm.number}`)
                      }
                    }}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8fafc' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}
                  >
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Link to={`/cms/${cm.number}`} style={{ textDecoration: 'none', color: '#1d4ed8', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
                          {cm.number}
                        </Link>
                        <p style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>
                          {cm.title}
                        </p>
                        {cm.internalId && (
                          <span style={{ fontSize: 11, color: '#7c3aed', fontFamily: 'monospace' }}>
                            {cm.internalId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top', fontSize: 12.5, color: '#334155' }}>
                      {cm.requestedBy}
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <p style={{ fontSize: 12.5, color: '#0f172a' }}>{cm.currentQueue}</p>
                        <span style={{
                          alignSelf: 'flex-start',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 999,
                          backgroundColor: stage.bg,
                          color: stage.color,
                        }}>
                          {stage.label}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top' }}>
                      <p style={{ fontSize: 12.5, color: '#0f172a' }}>{formatDateTime(cm.stageSince)}</p>
                      <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{formatElapsed(cm.stageSince)}</p>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top' }}>
                      <p style={{ fontSize: 12.5, color: '#0f172a' }}>{formatDate(cm.openedAt)}</p>
                      <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{formatTime(cm.openedAt)}</p>
                    </td>
                    <td style={{ padding: '0.75rem 0.9rem', verticalAlign: 'top', fontSize: 12.5, color: '#0f172a' }}>
                      {formatElapsed(cm.openedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

