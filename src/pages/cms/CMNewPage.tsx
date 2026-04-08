import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateCM } from '@/hooks/useCreateCM'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { Button, Input, Textarea } from '@/components/ui'
import { AlertCircle, ArrowLeft, Info, Sparkles, RefreshCw } from 'lucide-react'
import { toast } from '@/store/toastStore'
import { notifyCM } from '@/lib/msFormsNotifier'

export function CMNewPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const createMutation = useCreateCM()
  const { data: departments = [] } = useDepartments()

  const [formData, setFormData] = useState({ title: '', description: '' })
  const [isNewItem, setIsNewItem] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profile?.department?.slug !== 'vendas') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
          <AlertCircle size={22} style={{ color: '#dc2626' }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>Acesso Negado</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Apenas o departamento de Vendas pode criar CMs</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
          Voltar
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.title.trim())       { setError('Título é obrigatório'); return }
    if (!formData.description.trim()) { setError('Descrição é obrigatória'); return }
    try {
      const result = await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        createdBy: profile!.id,
        isNewItem,
      })
      toast.success('CM criada com sucesso!')

      const targetSlug = isNewItem ? 'eng_projetos' : 'pricing'
      const targetDept = departments.find((d) => d.slug === targetSlug)
      if (targetDept) {
        notifyCM({
          cm:           result,
          toDept:       targetDept,
          fromDeptName: profile?.department?.name ?? 'Vendas',
          actorName:    profile?.full_name ?? 'Desconhecido',
          eventType:    'created',
        })
      }

      navigate(`/cms/${result.number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar CM')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 640 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '0.375rem', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', flexShrink: 0, marginTop: 3, transition: 'background-color 0.15s, color 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Nova Consulta de Materiais</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Preencha as informações para criar a consulta</p>
        </div>
      </div>

      {/* Form card */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Título <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Input
              id="title"
              placeholder="Ex: Viabilidade de substituição de rolamento X-123"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Descrição breve e objetiva do assunto</p>
          </div>

          <div>
            <label htmlFor="description" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Descrição Detalhada <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Textarea
              id="description"
              placeholder="Descreva: cliente, aplicação, quantidade, especificações técnicas, requisitos especiais, contexto..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={7}
            />
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
              Tipo de item <span style={{ color: '#ef4444' }}>*</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {/* Não — Item existente */}
              <button
                type="button"
                onClick={() => setIsNewItem(false)}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem',
                  padding: '0.875rem 1rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                  border: isNewItem ? '1.5px solid #e2e8f0' : '1.5px solid #2563eb',
                  backgroundColor: isNewItem ? '#f8fafc' : '#eff6ff',
                  boxShadow: isNewItem ? 'none' : '0 0 0 3px rgba(37,99,235,0.08)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isNewItem ? '#f1f5f9' : '#dbeafe',
                  transition: 'background-color 0.15s',
                }}>
                  <RefreshCw size={16} style={{ color: isNewItem ? '#94a3b8' : '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: isNewItem ? '#64748b' : '#1d4ed8', margin: 0 }}>Item existente</p>
                  <p style={{ fontSize: 11, color: isNewItem ? '#94a3b8' : '#3b82f6', margin: 0, marginTop: 2 }}>Vai para Pricing</p>
                </div>
                {!isNewItem && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 16, height: 16, borderRadius: '50%',
                    backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>

              {/* Sim — Item novo */}
              <button
                type="button"
                onClick={() => setIsNewItem(true)}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem',
                  padding: '0.875rem 1rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                  border: !isNewItem ? '1.5px solid #e2e8f0' : '1.5px solid #7c3aed',
                  backgroundColor: !isNewItem ? '#f8fafc' : '#f5f3ff',
                  boxShadow: !isNewItem ? 'none' : '0 0 0 3px rgba(124,58,237,0.08)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: !isNewItem ? '#f1f5f9' : '#ede9fe',
                  transition: 'background-color 0.15s',
                }}>
                  <Sparkles size={16} style={{ color: !isNewItem ? '#94a3b8' : '#7c3aed' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: !isNewItem ? '#64748b' : '#6d28d9', margin: 0 }}>Item novo</p>
                  <p style={{ fontSize: 11, color: !isNewItem ? '#94a3b8' : '#7c3aed', margin: 0, marginTop: 2 }}>Vai para Eng. de Projetos</p>
                </div>
                {isNewItem && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 16, height: 16, borderRadius: '50%',
                    backgroundColor: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1, color: '#3b82f6' }} />
            <span>
              Após criar, a CM será automaticamente encaminhada para{' '}
              <strong>{isNewItem ? 'Eng. de Projetos' : 'Pricing'}</strong> para análise inicial.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Criar CM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
