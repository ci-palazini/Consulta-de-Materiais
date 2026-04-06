import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  className?: string
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary:   { backgroundColor: '#2563eb', color: '#fff', border: '1px solid transparent', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  secondary: { backgroundColor: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
  danger:    { backgroundColor: '#dc2626', color: '#fff', border: '1px solid transparent', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  ghost:     { backgroundColor: 'transparent', color: '#64748b', border: '1px solid transparent' },
  success:   { backgroundColor: '#16a34a', color: '#fff', border: '1px solid transparent', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
}

const HOVER_BG: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   '#1d4ed8',
  secondary: '#f8fafc',
  danger:    '#b91c1c',
  ghost:     '#f1f5f9',
  success:   '#15803d',
}

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: 13 },
  md: { padding: '0.5rem 1rem',      fontSize: 13.5 },
  lg: { padding: '0.625rem 1.25rem', fontSize: 15 },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, style, ...props }, ref) => {
    const isDisabled = isLoading || disabled

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          fontWeight: 500,
          borderRadius: 8,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.55 : 1,
          transition: 'background-color 0.15s, opacity 0.15s',
          outline: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          lineHeight: 1.4,
          ...VARIANT_STYLES[variant],
          ...SIZE_STYLES[size],
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = HOVER_BG[variant]
          props.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = (VARIANT_STYLES[variant].backgroundColor as string)
          props.onMouseLeave?.(e)
        }}
        className={className}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Carregando...
          </>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
