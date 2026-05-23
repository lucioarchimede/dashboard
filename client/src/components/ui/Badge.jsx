const VARIANTS = {
  green:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  red:     'bg-red-500/10 text-red-400 border border-red-500/20',
  yellow:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  neutral: 'bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]',
}

export function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const MAP = {
    completada: { label: 'Completada', variant: 'green' },
    pendiente:  { label: 'Pendiente',  variant: 'yellow' },
    cancelada:  { label: 'Cancelada',  variant: 'red' },
    ok:         { label: 'OK',         variant: 'green' },
    bajo:       { label: 'Stock bajo', variant: 'yellow' },
    agotado:    { label: 'Agotado',    variant: 'red' },
    activo:     { label: 'Activo',     variant: 'green' },
    inactivo:   { label: 'Inactivo',   variant: 'neutral' },
  }
  const { label, variant } = MAP[status] || { label: status, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function ChangeBadge({ value, suffix = '%' }) {
  if (value === null || value === undefined) return <span className="text-xs text-[#52525b]">—</span>
  const pos = value >= 0
  return (
    <Badge variant={pos ? 'green' : 'red'}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </Badge>
  )
}
