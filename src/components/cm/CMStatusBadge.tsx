import { Badge } from '@/components/ui'
import type { CMStatusType } from '@/types/enums'

const STATUS_CONFIG: Record<CMStatusType, { label: string; variant: 'info' | 'success' | 'danger' | 'default' }> = {
  open:              { label: 'Em Andamento',        variant: 'info' },
  closed_viable:     { label: 'Viável',              variant: 'success' },
  closed_not_viable: { label: 'Não Viável',          variant: 'danger' },
  closed_by_system:  { label: 'Finalizado pelo Sistema', variant: 'default' },
  cancelled:         { label: 'Cancelada',            variant: 'default' },
}

export function CMStatusBadge({ status }: { status: CMStatusType }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: 'default' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
