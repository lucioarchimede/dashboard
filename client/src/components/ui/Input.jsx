const BASE = 'w-full bg-[#18181b] border rounded-lg px-3 text-sm text-[#fafafa] placeholder-[#3f3f46] focus:outline-none transition-colors duration-150'
const NORMAL = 'border-[#27272a] focus:border-emerald-500/70 focus:bg-[#18181b]'
const ERROR  = 'border-red-500/50 focus:border-red-500/70'

export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[#a1a1aa]">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />}
        <input
          className={`${BASE} ${error ? ERROR : NORMAL} h-9 ${Icon ? 'pl-9' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[#a1a1aa]">{label}</label>}
      <select
        className={`${BASE} ${error ? ERROR : NORMAL} h-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[#a1a1aa]">{label}</label>}
      <textarea
        rows={rows}
        className={`${BASE} ${error ? ERROR : NORMAL} py-2 resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function FormRow({ children, cols = 2 }) {
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' }
  return <div className={`grid ${grid[cols]} gap-3`}>{children}</div>
}

export function FormSection({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      {title && <p className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">{title}</p>}
      {children}
    </div>
  )
}
