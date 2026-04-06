import { forwardRef, type InputHTMLAttributes } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={className}
      style={{
        width: '100%',
        height: 38,
        padding: '0 0.75rem',
        fontSize: 13.5,
        fontFamily: 'inherit',
        color: '#0f172a',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#2563eb'
        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e2e8f0'
        e.target.style.boxShadow = 'none'
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
)

Input.displayName = 'Input'
export { Input }
