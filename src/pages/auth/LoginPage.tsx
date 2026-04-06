import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const SYS_FONT = '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

export function LoginPage() {
  const location = useLocation()
  const { session, isLoading: authLoading, signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Aguarda a inicialização do auth antes de renderizar o formulário
  if (authLoading) return null

  // Se já há sessão, redireciona para onde o usuário queria ir
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'
  if (session) return <Navigate to={from} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error: loginError } = await signIn(email, password)
    
    if (loginError) {
      setError('Email ou senha inválidos. Verifique suas credenciais.')
      setIsLoading(false)
    }
    // Se sucesso: onAuthStateChange dispara SIGNED_IN → context atualiza →
    // componente re-renderiza → session != null → <Navigate> acima redireciona
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: SYS_FONT,
      backgroundColor: '#f8fafc',
    }}>

      {/* ── Left panel: branding ── */}
      <div style={{
        width: '42%',
        minWidth: 340,
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        padding: '2.5rem 3rem',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-left-panel">

        {/* subtle grid texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        {/* blue glow accent */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#fff',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>
            CM
          </div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
            Fluxo CM
          </span>
        </div>

        {/* Main copy — vertically centered in remaining space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Sistema de Gestão
          </p>
          <h1 style={{
            color: '#fff',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
          }}>
            Consulta de<br />Materiais
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
            Plataforma unificada para gestão e rastreamento do fluxo de consultas entre departamentos.
          </p>

          {/* Divider */}
          <div style={{ width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', margin: '2rem 0' }} />

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              'Rastreamento em tempo real',
              'Notificações por departamento',
              'Histórico completo de ações',
              'Gestão de viabilidade e OV',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, position: 'relative', zIndex: 1 }}>
          © 2026 Sistema de Consulta de Materiais
        </p>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}>
              Bem-vindo
            </h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              Entre com suas credenciais para acessar o sistema.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              borderRadius: 8,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email */}
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <svg
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: 40,
                    paddingLeft: 36,
                    paddingRight: 12,
                    fontSize: 14,
                    fontFamily: SYS_FONT,
                    color: '#0f172a',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <svg
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: 40,
                    paddingLeft: 36,
                    paddingRight: 12,
                    fontSize: 14,
                    fontFamily: SYS_FONT,
                    color: '#0f172a',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                height: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: isLoading ? '#93c5fd' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: SYS_FONT,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (!isLoading) (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8' }}
              onMouseLeave={(e) => { if (!isLoading) (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb' }}
            >
              {isLoading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: 12, textAlign: 'center', color: '#94a3b8' }}>
            Não tem acesso? Contate o administrador do sistema.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
