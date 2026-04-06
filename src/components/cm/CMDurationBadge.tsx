import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function CMDurationBadge({ createdAt }: { createdAt: string }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const update = () => {
      setDisplay(
        formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })
      )
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#94a3b8' }}>
      <Clock size={12} />
      <span>{display.replace(' atrás', '')}</span>
    </div>
  )
}
