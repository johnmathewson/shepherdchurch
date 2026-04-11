import Button from './Button'

export default function EmptyState({ icon, message, actionLabel, actionHref }) {
  return (
    <div className="text-center py-20">
      {icon && (
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <p className="text-text-secondary mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Button variant="ghost" href={actionHref} className="text-sage hover:text-sage-light">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
