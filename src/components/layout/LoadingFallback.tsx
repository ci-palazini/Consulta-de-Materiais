export function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem',
        }} />
        <p style={{ fontSize: 13, color: '#64748b' }}>Carregando...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
