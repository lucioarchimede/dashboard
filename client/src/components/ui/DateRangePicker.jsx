import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { today, startOfMonth, endOfMonth, daysAgo } from '../../utils/format'

const PRESETS = [
  { label: 'Hoy',          from: () => today(),          to: () => today() },
  { label: 'Esta semana',  from: () => daysAgo(6),        to: () => today() },
  { label: 'Este mes',     from: () => startOfMonth(),    to: () => endOfMonth() },
  { label: 'Últimos 30d',  from: () => daysAgo(29),       to: () => today() },
  { label: 'Últimos 90d',  from: () => daysAgo(89),       to: () => today() },
]

export function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const active = PRESETS.find(p => p.from() === from && p.to() === to)

  const label = active
    ? active.label
    : `${from?.slice(5).replace('-', '/')} → ${to?.slice(5).replace('-', '/')}`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-lg text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-150"
      >
        <Calendar size={14} className="flex-shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#1c1c21] border border-[#27272a] rounded-xl shadow-2xl w-56 py-1.5 overflow-hidden">
            <p className="px-3 py-1.5 text-[11px] text-[#52525b] font-semibold uppercase tracking-wider">Presets</p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { onChange(p.from(), p.to()); setOpen(false) }}
                className={`w-full text-left text-sm px-3 py-2 transition-colors duration-100 ${
                  from === p.from() && to === p.to()
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-[#27272a] mt-1.5 pt-2 px-3 pb-2 flex flex-col gap-2">
              <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-wider">Personalizado</p>
              <input
                type="date"
                value={from}
                onChange={e => onChange(e.target.value, to)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1.5 text-xs text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
              <input
                type="date"
                value={to}
                onChange={e => onChange(from, e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1.5 text-xs text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => setOpen(false)}
                className="w-full text-sm bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg py-1.5 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
