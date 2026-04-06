import { forwardRef, type TextareaHTMLAttributes } from 'react'

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={className}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        fontSize: 13.5,
        fontFamily: 'inherit',
        color: '#0f172a',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        outline: 'none',
        boxSizing: 'border-box',
        resize: 'vertical',
        minHeight: '6rem',
        lineHeight: 1.6,
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

Textarea.displayName = 'Textarea'
export { Textarea }
