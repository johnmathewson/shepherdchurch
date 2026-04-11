export default function Card({ className = '', hover = false, children, ...props }) {
  return (
    <div
      className={`glass rounded-lg p-5 ${hover ? 'hover:border-sage/40 hover:-translate-y-0.5 transition-all' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
