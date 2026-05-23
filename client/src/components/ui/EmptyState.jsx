import { Button } from './Button'

export function EmptyState({ icon: Icon, title, description, action, actionLabel, actionIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
          <Icon size={24} className="text-[#3f3f46]" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#fafafa] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#71717a] mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} icon={actionIcon}>{actionLabel}</Button>
      )}
    </div>
  )
}
