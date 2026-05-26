import { useState, useEffect } from 'react'
import { useCMsPaginated, PAGE_SIZE } from '@/hooks/useCMsPaginated'
import { useCMCreators } from '@/hooks/useCMCreators'
import { Button } from '@/components/ui'
import { CMCard } from '@/components/cm/CMCard'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Plus, Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'

type StatusFilter = 'all' | 'open' | 'closed'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',    label: 'Todas' },
  { value: 'open',   label: 'Em Andamento' },
  { value: 'closed', label: 'Finalizadas' },
]

export function CMListPage() {
  const { profile } = useAuth()
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [requesterFilter, setRequesterFilter] = useState('all')
  const [page, setPage]                   = useState(0)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [statusFilter, requesterFilter])

  const { data, isLoading, isFetching } = useCMsPaginated(page, {
    search: debouncedSearch,
    status: statusFilter,
    createdBy: requesterFilter,
  })

  const { data: creators } = useCMCreators()

  const cms      = data?.cms ?? []
  const total    = data?.total ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)
  const from      = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to        = Math.min((page + 1) * PAGE_SIZE, total)

  const canCreateCM = profile?.department?.slug === 'vendas' || profile?.department?.slug === 'pricing'

  const hasActiveFilter = debouncedSearch || statusFilter !== 'all' || requesterFilter !== 'all'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Consultas de Materiais</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {total > 0
              ? hasActiveFilter
                ? `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
                : `${total} consulta${total !== 1 ? 's' : ''} no total`
              : isLoading ? 'Carregando…' : 'Nenhuma consulta'}
          </p>
        </div>
        {canCreateCM && (
          <Link to="/cms/new">
            <Button>
              <Plus size={15} />
              Nova CM
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '0.875rem 1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.625rem',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por número, título, descrição ou código..."
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
            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
            onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Requester filter */}
        <div style={{ minWidth: 220 }}>
          <select
            value={requesterFilter}
            onChange={(e) => setRequesterFilter(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              outline: 'none',
              cursor: 'pointer',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
            onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none' }}
          >
            <option value="all">Todos os solicitantes</option>
            {(creators ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderRadius: 8, padding: 3, border: '1px solid #e2e8f0', gap: 2 }}>
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                backgroundColor: statusFilter === value ? '#fff' : 'transparent',
                color: statusFilter === value ? '#0f172a' : '#64748b',
                boxShadow: statusFilter === value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="animate-pulse" style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', height: 148 }} />
          ))}
        </div>
      ) : cms.length === 0 ? (
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
            {hasActiveFilter ? 'Nenhuma CM encontrada com esses filtros' : 'Nenhuma CM criada ainda'}
          </p>
          {canCreateCM && !hasActiveFilter && (
            <Link to="/cms/new" style={{ marginTop: '1rem' }}>
              <Button size="sm">
                <Plus size={14} />
                Criar primeira CM
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {cms.map((cm) => <CMCard key={cm.id} cm={cm} />)}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '0.625rem 1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            {from}–{to} de {total}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 10px',
                fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
                borderRadius: 7, border: '1px solid #e2e8f0',
                backgroundColor: page === 0 ? '#f8fafc' : '#fff',
                color: page === 0 ? '#cbd5e1' : '#374151',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={13} />
              Anterior
            </button>

            <span style={{ fontSize: 12.5, color: '#64748b', padding: '0 8px' }}>
              {page + 1} / {pageCount}
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pageCount - 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 10px',
                fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
                borderRadius: 7, border: '1px solid #e2e8f0',
                backgroundColor: page >= pageCount - 1 ? '#f8fafc' : '#fff',
                color: page >= pageCount - 1 ? '#cbd5e1' : '#374151',
                cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Próxima
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
