import { useState, useEffect, useCallback } from 'react'
import { Users, RefreshCw, Search, TrendingUp, ShoppingCart, DollarSign, Repeat2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { api } from '../utils/api'
import { formatCurrency, daysAgo, today } from '../utils/format'

function StatCard({ label, value, icon: Icon, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
  }
  return (
    <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={colors[color]} />
        <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-mono text-2xl font-bold text-[#fafafa]">{value ?? '—'}</p>
    </div>
  )
}

function CustomerRow({ c }) {
  const daysSince = c.last_purchase
    ? Math.round((Date.now() - new Date(c.last_purchase)) / 86400000)
    : null
  return (
    <tr className="border-b border-[#1e1e22] hover:bg-[#18181b]/40 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[#fafafa]">{c.name || '—'}</p>
        <p className="text-xs text-[#52525b]">{c.email}</p>
        {c.phone && <p className="text-xs text-[#52525b]">{c.phone}</p>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-mono text-sm text-[#fafafa]">{c.total_orders}</span>
        {c.is_repeat && (
          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            Recurrente
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-[#fafafa]">{formatCurrency(c.total_spent)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm text-[#a1a1aa]">{formatCurrency(c.avg_order_value)}</td>
      <td className="px-4 py-3 text-center text-xs text-[#a1a1aa]">{c.first_purchase}</td>
      <td className="px-4 py-3 text-center">
        <p className="text-xs text-[#a1a1aa]">{c.last_purchase}</p>
        {daysSince != null && (
          <p className={`text-[10px] ${daysSince > 90 ? 'text-amber-400' : 'text-[#52525b]'}`}>
            hace {daysSince}d
          </p>
        )}
      </td>
    </tr>
  )
}

export default function Clientes() {
  const [from, setFrom] = useState(daysAgo(179))
  const [to, setTo] = useState(today())
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.get('/clients', { from, to, search: search || undefined, limit: 100 })
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [from, to, search])

  useEffect(() => { load() }, [load])

  const { stats, data: customers = [] } = data || {}

  const repeatRate = stats?.total_customers > 0
    ? `${((stats.repeat_customers / stats.total_customers) * 100).toFixed(0)}%`
    : '—'

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button
          onClick={() => load(true)}
          className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Clientes" value={stats?.total_customers ?? '—'} icon={Users} color="emerald" />
          <StatCard label="Clientes Recurrentes" value={stats?.repeat_customers ?? '—'} icon={Repeat2} color="blue" />
          <StatCard label="Tasa Retención" value={repeatRate} icon={TrendingUp} color="amber" />
          <StatCard label="LTV Promedio" value={stats?.avg_ltv != null ? formatCurrency(stats.avg_ltv) : '—'} icon={DollarSign} color="violet" />
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111114] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
          />
        </div>

        {/* Table */}
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#27272a]">
            <p className="text-sm font-semibold text-[#fafafa]">Base de Clientes</p>
            <p className="text-xs text-[#52525b] mt-0.5">{data?.total ?? 0} clientes identificados por email</p>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="text-[#27272a] mx-auto mb-3" />
              <p className="text-sm text-[#71717a]">Sin clientes identificados en este período</p>
              <p className="text-xs text-[#52525b] mt-1">Registrá ventas con email del cliente para ver el CRM</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272a]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">Pedidos</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">LTV Total</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">AOV</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">Primera Compra</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => <CustomerRow key={c.email} c={c} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
