import { useDashboardMetrics, type MetricsDepartment } from '@/hooks/useDashboardMetrics'
import { DEPT_COLORS } from '@/lib/utils'
import { Clock, Gauge, CheckCircle2, FileText, AlertTriangle, Users, Timer } from 'lucide-react'

const ACCENT: Record<string, string> = {
  vendas: '#3b82f6',
  eng_projetos: '#a855f7',
  qualidade: '#22c55e',
  planejamento: '#06b6d4',
  suprimentos: '#f97316',
  eng_processos: '#ec4899',
  custos: '#f59e0b',
  pricing: '#f43f5e',
}

function fmtHours(h: number | null): string {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)}min`
  if (h < 48) return `${h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`
  return `${(h / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`
}

function fmtDays(d: number | null): string {
  if (d == null) return '—'
  return `${d.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card style={{ padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: `${color}14`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</p>}
      </div>
    </Card>
  )
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(ym: string) {
  const m = parseInt(ym.split('-')[1], 10)
  return MONTH_LABELS[m - 1] ?? ym
}

function DeptTimeBars({ departments }: { departments: MetricsDepartment[] }) {
  const ranked = [...departments]
    .filter((d) => d.avg_hours != null)
    .sort((a, b) => (b.avg_hours ?? 0) - (a.avg_hours ?? 0))
  const max = Math.max(...ranked.map((d) => d.avg_hours ?? 0), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {ranked.map((d, i) => {
        const color = ACCENT[d.slug] ?? '#64748b'
        const pct = ((d.avg_hours ?? 0) / max) * 100
        return (
          <div key={d.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                {i === 0 && <AlertTriangle size={13} style={{ color: '#ea580c' }} />}
                {d.name}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>{fmtHours(d.avg_hours)}</strong>
                <span style={{ color: '#94a3b8' }}> · mediana {fmtHours(d.median_hours)}</span>
              </span>
            </div>
            <div style={{ height: 9, borderRadius: 999, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: color, transition: 'width 0.4s' }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
              {d.holds} passagens{d.open_now > 0 && <> · <span style={{ color: '#ea580c', fontWeight: 600 }}>{d.open_now} na fila agora</span></>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyChart({ monthly }: { monthly: { month: string; created: number; finalized: number }[] }) {
  const max = Math.max(...monthly.flatMap((m) => [m.created, m.finalized]), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 150, padding: '0 4px' }}>
        {monthly.map((m) => (
          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%', width: '100%', justifyContent: 'center' }}>
              <div title={`${m.created} criadas`} style={{ width: '38%', maxWidth: 26, height: `${(m.created / max) * 100}%`, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', minHeight: m.created > 0 ? 3 : 0 }} />
              <div title={`${m.finalized} finalizadas`} style={{ width: '38%', maxWidth: 26, height: `${(m.finalized / max) * 100}%`, backgroundColor: '#22c55e', borderRadius: '4px 4px 0 0', minHeight: m.finalized > 0 ? 3 : 0 }} />
            </div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{monthLabel(m.month)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#3b82f6' }} /> Criadas
        </span>
        <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#22c55e' }} /> Finalizadas
        </span>
      </div>
    </div>
  )
}

function DeptMembersCard({ d }: { d: MetricsDepartment }) {
  const color = ACCENT[d.slug] ?? '#64748b'
  const badge = DEPT_COLORS[d.slug] ?? 'bg-slate-500 text-white'
  return (
    <Card style={{ padding: '1rem 1.125rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className={badge} style={{ fontSize: 12, fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
          {d.name}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
          {d.members.length} {d.members.length === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </div>
      {d.members.length === 0 ? (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>Sem membros cadastrados</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.members.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: `${color}1a`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {p.avatar_initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.full_name}
                  {p.role === 'admin' && <span style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.05rem 0.35rem', borderRadius: 4, marginLeft: 6, verticalAlign: 'middle' }}>ADMIN</span>}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MembersGrid({ departments }: { departments: MetricsDepartment[] }) {
  // Vendas tem muito mais gente — vai fixa numa coluna alta à direita;
  // os demais departamentos quebram em cards menores à esquerda.
  const pinned = departments.find((d) => d.slug === 'vendas')
  const rest = departments
    .filter((d) => d.slug !== 'vendas')
    .sort((a, b) => b.members.length - a.members.length)

  return (
    <>
      <style>{`
        .members-layout { display: flex; gap: 14px; align-items: flex-start; }
        .members-rest { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; align-content: start; }
        .members-pinned { width: 300px; flex-shrink: 0; }
        @media (max-width: 900px) {
          .members-layout { flex-direction: column; }
          .members-pinned { width: 100%; order: -1; }
        }
      `}</style>
      <div className="members-layout">
        <div className="members-rest">
          {rest.map((d) => <DeptMembersCard key={d.id} d={d} />)}
        </div>
        {pinned && (
          <div className="members-pinned">
            <DeptMembersCard d={pinned} />
          </div>
        )}
      </div>
    </>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{children}</h2>
      {hint && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{hint}</p>}
    </div>
  )
}

export function MetricsPage() {
  const { data, isLoading, error } = useDashboardMetrics()

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }} className="animate-fade-in">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse" style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', height: 90 }} />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#64748b' }}>Não foi possível carregar as métricas.</p>
      </Card>
    )
  }

  const { totals, lead_time, step_counts, departments, monthly } = data
  const viabilityRate = totals.viable_count + totals.not_viable_count > 0
    ? Math.round((totals.viable_count / (totals.viable_count + totals.not_viable_count)) * 100)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Métricas</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          Indicadores de fluxo das Consultas de Materiais · visão geral de todos os departamentos
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        <KpiCard label="Lead time médio (abertura → conclusão)" value={fmtDays(lead_time.avg_days)} sub={`Mediana ${fmtDays(lead_time.median_days)} · ${lead_time.n} CMs`} icon={Timer} color="#2563eb" />
        <KpiCard label="Total de CMs" value={String(totals.total)} sub={`${totals.open_count} em andamento · ${totals.closed_count} concluídas`} icon={FileText} color="#0ea5e9" />
        <KpiCard label="Taxa de viabilidade" value={viabilityRate != null ? `${viabilityRate}%` : '—'} sub={`${totals.viable_count} viáveis · ${totals.not_viable_count} inviáveis`} icon={CheckCircle2} color="#16a34a" />
        <KpiCard label="Retrabalho (recusas + contestações)" value={String(step_counts.refused + step_counts.contested)} sub={`${step_counts.refused} recusas · ${step_counts.contested} contestações`} icon={AlertTriangle} color="#ea580c" />
        <KpiCard label="Em andamento agora" value={String(totals.open_count)} sub={`${step_counts.parallel_dispatches} análises em paralelo no total`} icon={Clock} color="#7c3aed" />
        <KpiCard label="Finalizações automáticas" value={String(step_counts.auto_finalized)} sub="CMs concluídas pelo sistema" icon={Gauge} color="#0891b2" />
      </div>

      {/* Tempo por departamento */}
      <Card style={{ padding: '1.25rem 1.5rem' }}>
        <SectionTitle hint="Quanto tempo, em média, uma CM permanece em cada departamento. A mediana ignora casos extremos. Análises em paralelo contam o tempo de cada departamento separadamente.">
          Tempo médio por departamento
        </SectionTitle>
        <DeptTimeBars departments={departments} />
      </Card>

      {/* Volume mensal */}
      <Card style={{ padding: '1.25rem 1.5rem' }}>
        <SectionTitle hint="CMs criadas e finalizadas por mês (últimos 6 meses)">Volume mensal</SectionTitle>
        <MonthlyChart monthly={monthly} />
      </Card>

      {/* Membros */}
      <section>
        <SectionTitle hint="Quem faz parte de cada departamento — útil para saber com quem falar quando uma CM está na fila deles">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Users size={15} /> Membros por departamento</span>
        </SectionTitle>
        <MembersGrid departments={departments} />
      </section>

      <p style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>
        Atualizado em {new Date(data.generated_at).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}
