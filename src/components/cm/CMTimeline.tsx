import { CMTimelineStep } from './CMTimelineStep'
import type { CMStep } from '@/types/domain'

export function CMTimeline({ steps }: { steps: CMStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: 13, color: '#64748b' }}>
        Nenhum passo registrado
      </div>
    )
  }

  return (
    <div>
      {steps.map((step, index) => (
        <CMTimelineStep
          key={step.id}
          step={step}
          nextStep={steps[index + 1]}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  )
}
