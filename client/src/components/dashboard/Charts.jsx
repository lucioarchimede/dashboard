import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts'
import { formatCurrency, formatDate } from '../../utils/format'
import { Card, CardHeader } from '../ui/Card'

const CHART_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#a3a3a3']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c21] border border-[#27272a] rounded-lg px-3 py-2.5 shadow-xl text-xs">
      {label && <p className="text-[#52525b] mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#a1a1aa]">{p.name}:</span>
          <span className="text-[#fafafa] font-mono font-medium">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const axisStyle = { fill: '#52525b', fontSize: 10 }

export function RevenueChart({ data }) {
  const formatted = data.map(d => ({
    ...d,
    date: formatDate(d.date),
    revenue: Math.round(d.revenue),
    expenses: Math.round(d.expenses),
  }))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <p className="text-sm font-semibold text-[#fafafa]">Ingresos vs Gastos</p>
      </CardHeader>
      <div className="p-5 pt-3">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#10b981" strokeWidth={1.5} fill="url(#gRevenue)" dot={false} />
            <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ef4444" strokeWidth={1.5} fill="url(#gExpenses)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function CostPieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <p className="text-sm font-semibold text-[#fafafa]">Distribución de Costos</p>
      </CardHeader>
      <div className="p-5 pt-3 flex items-center gap-4 min-h-[200px]">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {data.slice(0, 7).map((d, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-xs text-[#a1a1aa] truncate flex-1">{d.name}</span>
              <span className="text-xs font-mono text-[#52525b] flex-shrink-0">
                {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function StockEvolutionChart({ data }) {
  const formatted = data.map(d => {
    const [y, m] = d.month.split('-')
    const label = new Date(+y, +m - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    return { label, net_change: d.net_change }
  })
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <p className="text-sm font-semibold text-[#fafafa]">Evolución de Stock (últimos 6 meses)</p>
      </CardHeader>
      <div className="p-5 pt-3">
        <ResponsiveContainer width="100%" height={175}>
          <LineChart data={formatted} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="net_change" name="Variación Stock" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function TopProductsChart({ data }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <p className="text-sm font-semibold text-[#fafafa]">Top 5 Productos por Ganancia</p>
      </CardHeader>
      <div className="p-5 pt-3">
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" horizontal={false} />
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
