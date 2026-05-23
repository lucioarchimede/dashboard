import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { CardSkeleton } from '../ui/Spinner'

export function KPICard({ label, value, change, icon: Icon, format = 'currency', sub, loading }) {
  if (loading) return <CardSkeleton />
  const display = format === 'currency' ? formatCurrency(value)
    : format === 'number' ? (value?.toLocaleString('es-AR') ?? '0')
    : value ?? '—'
  const hasChange = change !== null && change !== undefined
  const pos = hasChange && change >= 0

  return (
    <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider leading-none">{label}</p>
        {Icon && <Icon size={15} className="text-[#3f3f46] flex-shrink-0" strokeWidth={1.75} />}
      </div>
      <p className="font-mono text-[22px] font-semibold text-[#fafafa] leading-none mb-2 truncate">{display}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {sub && <p className="text-xs text-[#52525b]">{sub}</p>}
        {hasChange && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            pos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {pos ? '+' : ''}{change?.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

export function NetProfitHero({ value, margin, change, loading }) {
  if (loading) return <CardSkeleton className="h-32" />
  const pos = value >= 0

  return (
    <div className={`bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-6 transition-colors duration-200 ${
      pos ? 'border-l-[3px] border-l-emerald-500' : 'border-l-[3px] border-l-red-500'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Ganancia Neta del Período</p>
          <p className={`font-mono text-4xl font-bold leading-none mb-3 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(value)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[#71717a]">
              Margen: <span className="font-mono font-semibold text-[#fafafa]">{margin?.toFixed(1)}%</span>
            </span>
            {change !== null && change !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {change >= 0 ? '+' : ''}{change?.toFixed(1)}% vs período ant.
              </span>
            )}
          </div>
        </div>
        <div className={`text-right px-4 py-2 rounded-xl ${pos ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <p className={`text-xs font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
            {pos ? 'Rentable ✓' : 'En pérdida ✗'}
          </p>
        </div>
      </div>
      {/* Margin progress bar */}
      <div className="mt-4 w-full bg-[#27272a] rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all duration-700 ${pos ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(Math.abs(margin || 0), 100)}%` }}
        />
      </div>
    </div>
  )
}
