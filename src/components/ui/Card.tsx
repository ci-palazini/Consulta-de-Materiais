import { forwardRef, type HTMLAttributes } from 'react'

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        padding: '1.5rem',
        ...style,
      }}
      {...props}
    />
  )
)

Card.displayName = 'Card'
export { Card }
