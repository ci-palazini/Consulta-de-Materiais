import { forwardRef, type HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
}

const BADGE_STYLES: Record<NonNullable<BadgeProps['variant']>, React.CSSProperties> = {
  default: { backgroundColor: '#f1f5f9', color: '#475569' },
  success: { backgroundColor: '#dcfce7', color: '#15803d' },
  danger:  { backgroundColor: '#fee2e2', color: '#dc2626' },
  warning: { backgroundColor: '#fef3c7', color: '#d97706' },
  info:    { backgroundColor: '#dbeafe', color: '#1d4ed8' },
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', style, ...props }, ref) => (
    <span
      ref={ref}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.6rem',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        ...BADGE_STYLES[variant],
        ...style,
      }}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'
export { Badge }
