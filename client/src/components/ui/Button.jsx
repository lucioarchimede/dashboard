import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 shadow-sm shadow-emerald-500/20',
  secondary: 'bg-transparent text-[#a1a1aa] border border-[#27272a] hover:bg-[#18181b] hover:text-[#fafafa] hover:border-[#3f3f46]',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
  ghost: 'bg-transparent text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa]',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin flex-shrink-0" />
        : Icon
        ? <Icon size={14} className="flex-shrink-0" />
        : null}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className = '', ...props }) {
  const sz = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9' }
  const iconSz = { sm: 13, md: 15, lg: 16 }
  return (
    <button
      type="button"
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 ${VARIANTS[variant]} ${sz[size]} ${className}`}
      {...props}
    >
      <Icon size={iconSz[size]} />
    </button>
  )
}
