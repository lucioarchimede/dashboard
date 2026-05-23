export function Card({ children, className = '', accent }) {
  const accentClass = accent === 'green'
    ? 'border-l-[3px] border-l-emerald-500'
    : accent === 'red'
    ? 'border-l-[3px] border-l-red-500'
    : ''
  return (
    <div className={`bg-[#111114] border border-[#27272a] rounded-xl transition-colors duration-200 hover:border-[#3f3f46] ${accentClass} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-[#27272a] ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="ml-3 flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <Card accent={accent} className="p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider leading-none">{label}</p>
        {Icon && <Icon size={15} className="text-[#3f3f46]" strokeWidth={1.75} />}
      </div>
      <p className="font-mono text-2xl font-semibold text-[#fafafa] leading-none mb-1.5">{value}</p>
      {sub && <p className="text-xs text-[#52525b]">{sub}</p>}
    </Card>
  )
}
