import { useState, useCallback, useEffect } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, RefreshCw, Package, RotateCcw, Clock, Users, Percent } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { NetProfitHero, KPICard } from '../components/dashboard/KPICard'
import { RevenueChart, CostPieChart, TopProductsChart, StockEvolutionChart } from '../components/dashboard/Charts'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { Tabs } from '../components/ui/Tabs'
import { CardSkeleton } from '../components/ui/Spinner'
import { api } from '../utils/api'
import { formatCurrency, startOfMonth, endOfMonth, today, daysAgo } from '../utils/format'

const PERIOD_TABS = [
  { label: 'Hoy',         value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes',    value: 'month' },
  { label: 'Últimos 30d', value: '30d' },
  { label: 'Últimos 90d', value: '90d' },
  { label: 'Últimos 6m',  value: '6m' },
]

function periodToRange(period) {
  switch (period) {
    case 'today': return { from: today(), to: today() }
    case 'week':  return { from: daysAgo(6), to: today() }
    case 'month': return { from: startOfMonth(), to: endOfMonth() }
    case '30d':   return { from: daysAgo(29), to: today() }
    case '90d':   return { from: daysAgo(89), to: today() }
    case '6m':    return { from: daysAgo(179), to: today() }
    default:      return { from: daysAgo(179), to: today() }
  }
}

const CHANNEL_LABELS = {
  shopify: 'Shopify', mercadolibre: 'MercadoLibre',
  instagram: 'Instagram', whatsapp: 'WhatsApp', otro: 'Otro'
}

const STATUS_CFG = {
  out: { label: 'Sin stock', cls: 'bg-red-500/10 text-red-400' },
  low: { label: 'Stock bajo', cls: 'bg-amber-500/10 text-amber-400' },
  ok:  { label: 'OK',         cls: 'bg-emerald-500/10 text-emerald-400' },
}

function RecentSalesTable({ data }) {
  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden hover:border-[#3f3f46] transition-colors">
      <div className="px-5 py-4 border-b border-[#27272a]">
        <p className="text-sm font-semibold text-[#fafafa]">Últimas Ventas</p>
      </div>
      <div className="divide-y divide-[#1e1e22]">
        {data.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#fafafa] truncate">{s.product_name}</p>
              <p className="text-xs text-[#52525b]">{CHANNEL_LABELS[s.channel] || s.channel} · {s.sale_date}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-mono font-semibold text-[#fafafa]">{formatCurrency(s.total)}</p>
              <p className="text-xs text-[#52525b]">×{s.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StockStatusTable({ data }) {
  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden hover:border-[#3f3f46] transition-colors">
      <div className="px-5 py-4 border-b border-[#27272a]">
        <p className="text-sm font-semibold text-[#fafafa]">Estado del Stock</p>
      </div>
      <div className="divide-y divide-[#1e1e22]">
        {data.map(p => {
          const sc = STATUS_CFG[p.status] || STATUS_CFG.ok
          return (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#fafafa] truncate">{p.name}</p>
                <p className="text-xs text-[#52525b]">{p.sku} · {p.current_stock} uds</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.days_remaining != null && (
                  <span className="text-xs text-[#52525b] font-mono">{p.days_remaining}d</span>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState('6m')
  const [{ from, to }, setRange] = useState(periodToRange('6m'))
  const [kpis, setKpis] = useState(null)
  const [charts, setCharts] = useState(null)
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  function handlePeriodChange(p) {
    setPeriod(p)
    setRange(periodToRange(p))
  }

  function handleCustomRange(f, t) {
    setPeriod(null)
    setRange({ from: f, to: t })
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [k, c, inv] = await Promise.all([
        api.get('/dashboard/kpis', { from, to }),
        api.get('/dashboard/charts', { from, to }),
        api.get('/dashboard/inventory'),
      ])
      setKpis(k)
      setCharts(c)
      setInventory(inv)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const noData = !loading && kpis && kpis.total_orders === 0

  const ticketPromedio = kpis?.total_orders > 0
    ? formatCurrency(kpis.revenue / kpis.total_orders)
    : '—'

  const margenBruto = kpis?.revenue > 0
    ? `${((kpis.gross_profit / kpis.revenue) * 100).toFixed(1)}%`
    : '—'

  const invDays = inventory?.inventory_days != null
    ? `${inventory.inventory_days} días`
    : '—'

  const turnover = inventory?.stock_turnover != null
    ? `${inventory.stock_turnover}x`
    : '—'

  const cogsDisplay = kpis?.cogs_percent != null
    ? `${kpis.cogs_percent.toFixed(1)}%`
    : '—'

  const ccc = inventory?.inventory_days != null
    ? `${Math.max(-99, inventory.inventory_days - 30)} días`
    : '—'

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button
          onClick={() => load(true)}
          className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <DateRangePicker from={from} to={to} onChange={handleCustomRange} />
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">
        <Tabs tabs={PERIOD_TABS} value={period} onChange={handlePeriodChange} className="max-w-xl" />

        {/* Hero — Net Profit */}
        {loading
          ? <CardSkeleton className="h-[100px]" />
          : <NetProfitHero
              value={kpis?.net_profit ?? 0}
              margin={kpis?.margin ?? 0}
              change={kpis?.profit_change}
            />
        }

        {/* 8 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard loading={loading} label="Ingresos" value={kpis?.revenue} change={kpis?.revenue_change} icon={DollarSign} />
          <KPICard loading={loading} label="AOV (Ticket Prom.)" value={ticketPromedio} format="raw" icon={ShoppingCart} />
          <KPICard loading={loading} label="Unidades Vendidas" value={kpis?.units_sold} format="number" icon={Package} />
          <KPICard loading={loading} label="LTV (Valor/Cliente)" value={kpis?.ltv != null ? kpis.ltv : '—'} format={kpis?.ltv != null ? 'currency' : 'raw'} icon={Users} />
          <KPICard loading={loading} label="Margen Bruto %" value={margenBruto} format="raw" icon={TrendingUp} />
          <KPICard loading={loading} label="COGS %" value={cogsDisplay} format="raw" icon={Percent} />
          <KPICard loading={loading || !inventory} label="Días de Inventario" value={invDays} format="raw" icon={Clock} />
          <KPICard loading={loading || !inventory} label="Ciclo Conv. Efectivo" value={ccc} format="raw" icon={RotateCcw} />
        </div>

        {noData ? (
          <div className="bg-[#111114] border border-[#27272a] rounded-xl p-12 text-center">
            <p className="text-sm text-[#71717a]">Sin ventas en este período. Seleccioná otro rango de fechas o registrá nuevas ventas.</p>
          </div>
        ) : (
          <>
            {/* Revenue + Cost donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                {loading
                  ? <div className="bg-[#111114] border border-[#27272a] rounded-xl h-[280px] animate-pulse" />
                  : charts?.timeline?.length > 0
                  ? <RevenueChart data={charts.timeline} />
                  : null}
              </div>
              <div>
                {loading
                  ? <div className="bg-[#111114] border border-[#27272a] rounded-xl h-[280px] animate-pulse" />
                  : charts?.costDistribution?.length > 0
                  ? <CostPieChart data={charts.costDistribution} />
                  : null}
              </div>
            </div>

            {/* Top products + Stock evolution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!loading && charts?.topProducts?.length > 0 && (
                <TopProductsChart data={charts.topProducts} />
              )}
              {!loading && inventory?.stock_evolution?.length > 0 && (
                <StockEvolutionChart data={inventory.stock_evolution} />
              )}
            </div>

            {/* Recent sales + Stock status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!loading && inventory?.recent_sales?.length > 0 && (
                <RecentSalesTable data={inventory.recent_sales} />
              )}
              {!loading && inventory?.stock_status?.length > 0 && (
                <StockStatusTable data={inventory.stock_status} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
