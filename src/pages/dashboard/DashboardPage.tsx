import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCMs } from '@/hooks/useCMs'
import { Button } from '@/components/ui'
import { CMCard } from '@/components/cm/CMCard'
import { Plus, Clock, CheckCircle2, Inbox } from 'lucide-react'

const STAT_COLORS = [
  { bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe' },
  { bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0' },
  { bg: '#f0fdf4', icon: '#15803d', border: '#86efac' },
  { bg: '#fff7ed', icon: '#ea580c', border: '#fed7aa' },
]

function StatCard({ label, value, icon: Icon, colorIdx }: { label: string; value: number; icon: React.ElementType; colorIdx: number }) {
  const c = STAT_COLORS[colorIdx]
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      padding: '1.125rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
    }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color: c.icon }} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: '2.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <Inbox size={20} style={{ color: '#94a3b8' }} />
      </div>
      <p style={{ fontSize: 13, color: '#64748b' }}>{message}</p>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse" style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', height: 148 }} />
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: allCMs, isLoading } = useCMs()
  const { data: deptCMs } = useCMs(
    profile?.department_id ? { departmentId: profile.department_id, status: 'open' } : undefined
  )

  const pendingInMyDept = deptCMs || []

  const totalOpen   = allCMs?.filter((cm) => cm.status === 'open').length || 0
  const totalClosed = allCMs?.filter((cm) => cm.status !== 'open').length || 0
  const isVendas    = profile?.department?.slug === 'vendas'
  const firstName   = profile?.full_name?.split(' ')[0] || 'Usuário'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Olá, {firstName}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {profile?.department?.name} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {isVendas && (
          <Link to="/cms/new">
            <Button>
              <Plus size={15} />
              Nova CM
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="Em Andamento"  value={totalOpen}              icon={Clock}        colorIdx={0} />
        <StatCard label="Finalizadas"   value={totalClosed}            icon={CheckCircle2} colorIdx={1} />
        <StatCard label="Na Minha Fila" value={pendingInMyDept.length} icon={Inbox}        colorIdx={3} />
      </div>

      {/* Pending in my department */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Pendentes no Meu Departamento</h2>
          {pendingInMyDept.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', backgroundColor: '#ea580c', padding: '0.1rem 0.5rem', borderRadius: 999 }}>
              {pendingInMyDept.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <LoadingGrid />
        ) : pendingInMyDept.length === 0 ? (
          <EmptyState message="Nenhuma CM aguardando ação do seu departamento" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {pendingInMyDept.map((cm) => <CMCard key={cm.id} cm={cm} />)}
          </div>
        )}
      </section>

      {/* Recent CMs */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>CMs Recentes</h2>
          <Link to="/cms" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Ver todas →
          </Link>
        </div>
        {isLoading ? (
          <LoadingGrid />
        ) : allCMs && allCMs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {allCMs.slice(0, 6).map((cm) => <CMCard key={cm.id} cm={cm} />)}
          </div>
        ) : (
          <EmptyState message="Nenhuma CM criada ainda" />
        )}
      </section>
    </div>
  )
}
