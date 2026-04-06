import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CMStep } from '@/types/domain'

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  created:   { bg: '#eff6ff', color: '#2563eb', label: '📝' },
  forwarded: { bg: '#f5f3ff', color: '#6d28d9', label: '➜'  },
  returned:  { bg: '#fffbeb', color: '#d97706', label: '↩️' },
  finalized: { bg: '#f0fdf4', color: '#15803d', label: '✅' },
}

export function CMTimelineStep({ step, nextStep, isLast }: { step: CMStep; nextStep?: CMStep; isLast: boolean }) {
  const actionLabels: Record<string, string> = {
    created:   'Criada',
    forwarded: 'Encaminhada para',
    returned:  'Retornada para',
    finalized: 'Finalizada',
  }

  const cfg = ACTION_COLORS[step.action] || { bg: '#f8fafc', color: '#64748b', label: '◉' }

  let durationDisplay = ''
  if (nextStep) {
    const minutes = differenceInMinutes(new Date(nextStep.created_at), new Date(step.created_at))
    if (minutes < 60) {
      durationDisplay = `${minutes}min`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const mins  = minutes % 60
      durationDisplay = `${hours}h ${mins}min`
    } else {
      const days  = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      durationDisplay = `${days}d ${hours}h`
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.875rem', paddingBottom: isLast ? 0 : '1.5rem' }}>
      {/* Icon + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: cfg.bg,
          color: cfg.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          border: `1px solid ${cfg.bg === '#f8fafc' ? '#e2e8f0' : 'transparent'}`,
        }}>
          {cfg.label}
        </div>
        {!isLast && (
          <div style={{ width: 1, flex: 1, backgroundColor: '#f1f5f9', margin: '4px 0' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
            {actionLabels[step.action] || step.action}
          </span>
          {step.to_department && (
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>
              {step.to_department.name}
            </span>
          )}
        </div>

        {step.notes && (
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, fontStyle: 'italic' }}>"{step.notes}"</p>
        )}

        {step.actor && (
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            por <span style={{ fontWeight: 500, color: '#374151' }}>{step.actor.full_name}</span>
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
          <span>
            {formatDistanceToNow(new Date(step.created_at), { addSuffix: true, locale: ptBR })}
          </span>
          {durationDisplay && (
            <span>⏱ {durationDisplay} neste depto</span>
          )}
        </div>
      </div>
    </div>
  )
}
