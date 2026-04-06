import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const location = useLocation()
  const { session, isLoading: authLoading, signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (authLoading) return null

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
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --accent:      #2563eb;
          --accent-dark: #1d4ed8;
          --accent-glow: rgba(37,99,235,0.15);
          --font-sans:   "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .lp-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: var(--font-sans);
          background-color: #1e2536;
          background-image:
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.1) 0%, transparent 70%),
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
          background-size: 100% 100%, 28px 28px;
        }

        /* top badge */
        .lp-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          animation: lp-up 0.5s ease both;
        }

        .lp-badge-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.03em;
          flex-shrink: 0;
        }

        .lp-badge-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.01em;
        }

        /* card */
        .lp-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 14px;
          padding: 2rem;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.06),
            0 4px 6px rgba(0,0,0,0.3),
            0 20px 60px rgba(0,0,0,0.5);
          animation: lp-up 0.5s 0.08s ease both;
        }

        /* logos row */
        .lp-logos {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1.25rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #f0eeeb;
        }

        .lp-logos-sep {
          width: 1px;
          height: 22px;
          background: #ddd;
          flex-shrink: 0;
        }

        /* heading */
        .lp-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 0.25rem;
        }

        .lp-subtitle {
          font-size: 13px;
          color: #888;
          font-weight: 300;
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }

        /* error */
        .lp-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          margin-bottom: 0.875rem;
          border-radius: 8px;
          background: #fff5f5;
          border: 1px solid #ffd6d6;
          color: #c0392b;
          font-size: 12.5px;
          line-height: 1.5;
          animation: lp-up 0.2s ease both;
        }

        /* field */
        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .lp-label {
          font-size: 12px;
          font-weight: 500;
          color: #555;
          letter-spacing: 0.01em;
        }

        .lp-input-wrap {
          position: relative;
        }

        .lp-input-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #bbb;
          transition: color 0.15s;
          display: flex;
        }

        .lp-input {
          width: 100%;
          height: 40px;
          padding: 0 10px 0 34px;
          font-size: 13.5px;
          font-family: var(--font-sans);
          font-weight: 400;
          color: #111;
          background: #fafafa;
          border: 1.5px solid #e8e8e8;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          -webkit-appearance: none;
        }

        .lp-input::placeholder { color: #bbb; }

        .lp-input:focus {
          background: #fff;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .lp-input-wrap:focus-within .lp-input-icon { color: var(--accent); }

        /* divider before button */
        .lp-sep {
          height: 1px;
          background: #f0eeeb;
          margin: 1rem 0;
        }

        /* button */
        .lp-btn {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: var(--font-sans);
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }

        .lp-btn:hover:not(:disabled) {
          background: var(--accent-dark);
          box-shadow: 0 3px 14px rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }

        .lp-btn:active:not(:disabled) { transform: translateY(0); }

        .lp-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* footer */
        .lp-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 11.5px;
          color: rgba(255,255,255,0.2);
          font-weight: 300;
          animation: lp-up 0.5s 0.16s ease both;
        }

        @keyframes lp-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="lp-page">

        {/* top badge */}
        <div className="lp-badge">
          <div className="lp-badge-icon">CM</div>
          <span className="lp-badge-label">Fluxo CM · Sistema de Gestão</span>
        </div>

        {/* card */}
        <div className="lp-card">

          {/* logos */}
          <div className="lp-logos">
            <img src="/hiter logo.png" alt="Hiter" style={{ height: 30, objectFit: 'contain' }} />
            <div className="lp-logos-sep" />
            <img src="/SXS_master_blue_rgb_150ppi.png" alt="SXS" style={{ height: 22, objectFit: 'contain' }} />
          </div>

          {/* heading */}
          <h1 className="lp-title">Bem-vindo</h1>
          <p className="lp-subtitle">Entre com suas credenciais para acessar.</p>

          {/* error */}
          {error && (
            <div className="lp-error">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* form */}
          <form onSubmit={handleSubmit}>
            <div className="lp-field">
              <label htmlFor="email" className="lp-label">Email</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input id="email" type="email" className="lp-input" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email" />
              </div>
            </div>

            <div className="lp-field">
              <label htmlFor="password" className="lp-label">Senha</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input id="password" type="password" className="lp-input" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password" />
              </div>
            </div>

            <div className="lp-sep" />

            <button type="submit" className="lp-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="lp-footer">Não tem acesso? Contate o administrador · © Melhoria Contínua 2026</p>
      </div>
    </>
  )
}
