import { Link } from 'react-router-dom'
import { CMStatusBadge } from './CMStatusBadge'
import { CMDurationBadge } from './CMDurationBadge'
import { ArrowRight } from 'lucide-react'
import type { CM } from '@/types/domain'

const DEPT_COLORS: Record<string, { bg: string; color: string }> = {
  vendas:         { bg: '#eff6ff', color: '#1d4ed8' },
  eng_projetos:   { bg: '#f5f3ff', color: '#6d28d9' },
  qualidade:      { bg: '#f0fdf4', color: '#15803d' },
  planejamento:   { bg: '#ecfeff', color: '#0e7490' },
  suprimentos:    { bg: '#fff7ed', color: '#c2410c' },
  eng_processos:  { bg: '#fdf2f8', color: '#be185d' },
  custos:         { bg: '#fffbeb', color: '#b45309' },
  pricing:        { bg: '#fff1f2', color: '#be123c' },
}

export function CMCard({ cm }: { cm: CM }) {
  const dept = cm.current_department
  const deptStyle = dept
    ? DEPT_COLORS[dept.slug] || { bg: '#f8fafc', color: '#475569' }
    : { bg: '#f8fafc', color: '#475569' }

  return (
    <Link to={`/cms/${cm.number}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'box-shadow 0.15s, transform 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
        }}
      >
        <div style={{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.625rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 3 }}>{cm.number}</p>
              <h3 style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#0f172a',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {cm.title}
              </h3>
            </div>
            <CMStatusBadge status={cm.status} />
          </div>

          {/* Description */}
          <p style={{
            fontSize: 12.5,
            color: '#64748b',
            lineHeight: 1.5,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {cm.description}
          </p>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.625rem',
            borderTop: '1px solid #f1f5f9',
            marginTop: 'auto',
          }}>
            {/* Creator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {cm.creator && (
                <>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: '#1d4ed8',
                    flexShrink: 0,
                  }}>
                    {cm.creator.avatar_initials}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {cm.creator.full_name.split(' ')[0]}
                  </span>
                </>
              )}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dept && (
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  backgroundColor: deptStyle.bg,
                  color: deptStyle.color,
                }}>
                  {dept.name}
                </span>
              )}
              <CMDurationBadge createdAt={cm.updated_at} />
              <ArrowRight size={13} style={{ color: '#cbd5e1' }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
