import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { UnderlineTabs } from '../components/ui/Tabs'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table'
import { Skeleton, TableSkeleton } from '../components/ui/Spinner'
import { api } from '../utils/api'
import { formatCurrency } from '../utils/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const REPORT_TABS = [
  { label: 'P&L del Mes', value: 'pnl' },
  { label: 'Comparativo Mensual', value: 'monthly' },
  { label: 'Por Canal', value: 'channel' },
]

function ChangeCell({ value }) {
  if (value === null || value === undefined) return <Td className="text-[#52525b] text-xs">—</Td>
  const isPos = value >= 0
  return (
    <Td>
      <span className={`inline-flex items-center gap-1 text-xs font-medium font-mono ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {isPos ? '+' : ''}{value.toFixed(1)}%
      </span>
    </Td>
  )
}

function PnlSkeletons() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-8 w-40 mb-3" />
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-3 w-full" />)}
          </div>
        </Card>
      ))}
    </div>
  )
}

function PnlTab({ pnl, loading }) {
  if (loading) return <PnlSkeletons />
  if (!pnl) return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-12 text-center">
      <p className="text-sm text-[#71717a]">Sin datos para el mes seleccionado</p>
    </div>
  )

  const breakEvenProgress = pnl.break_even_revenue > 0
    ? Math.min((pnl.revenue / pnl.break_even_revenue) * 100, 100)
    : 100

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Net profit hero */}
      <Card accent={pnl.net_profit >= 0 ? 'green' : 'red'}>
        <CardBody>
          <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Ganancia Neta del Mes</p>
          <p className={`font-mono text-3xl font-bold mb-2 ${pnl.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(pnl.net_profit)}
          </p>
          <p className="text-sm text-[#a1a1aa]">
            Margen neto: <span className="font-mono font-semibold text-[#fafafa]">{pnl.net_margin}%</span>
          </p>
          <div className="mt-3 w-full bg-[#27272a] rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-700 ${pnl.net_profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.abs(pnl.net_margin), 100)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#71717a]">
            <span>{pnl.orders} órdenes</span>
            {pnl.orders > 0 && (
              <>
                <span>·</span>
                <span>Ticket prom: {formatCurrency(pnl.avg_order_value)}</span>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* P&L breakdown */}
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-[#fafafa] mb-4">Estado de resultados</p>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a1a1aa]">Ingresos</span>
              <span className="font-mono font-semibold text-[#fafafa]">{formatCurrency(pnl.revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a1a1aa]">Costo de mercadería</span>
              <span className="font-mono text-red-400">−{formatCurrency(pnl.cogs)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a1a1aa]">Comisiones y envíos</span>
              <span className="font-mono text-red-400">−{formatCurrency(pnl.sale_fees)}</span>
            </div>
            <div className="h-px bg-[#27272a]" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#fafafa]">Ganancia bruta</span>
              <span className={`font-mono font-semibold ${pnl.gross_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(pnl.gross_profit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#71717a]">Margen bruto</span>
              <span className="font-mono text-xs text-[#a1a1aa]">{pnl.gross_margin}%</span>
            </div>
            <div className="h-px bg-[#27272a]" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a1a1aa]">Gastos operativos</span>
              <span className="font-mono text-red-400">−{formatCurrency(pnl.total_expenses)}</span>
            </div>
            {pnl.marketing_spend > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#a1a1aa]">Publicidad</span>
                <span className="font-mono text-red-400">−{formatCurrency(pnl.marketing_spend)}</span>
              </div>
            )}
            <div className="h-px bg-[#27272a]" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[#fafafa]">Ganancia neta</span>
              <span className={`font-mono font-bold text-lg ${pnl.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(pnl.net_profit)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Expenses by category */}
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-[#fafafa] mb-4">Desglose de gastos operativos</p>
          {pnl.expenses_breakdown.length === 0 ? (
            <p className="text-xs text-[#52525b]">Sin gastos operativos en el período</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pnl.expenses_breakdown.map(e => {
                const pct = pnl.total_expenses > 0 ? ((e.total / pnl.total_expenses) * 100).toFixed(0) : 0
                return (
                  <div key={e.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-[#a1a1aa]">{e.category}</span>
                      <span className="font-mono text-xs text-red-400">−{formatCurrency(e.total)}</span>
                    </div>
                    <div className="w-full bg-[#27272a] rounded-full h-1">
                      <div className="bg-red-500/50 h-1 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="h-px bg-[#27272a] mt-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#fafafa]">Total</span>
                <span className="font-mono font-semibold text-red-400">−{formatCurrency(pnl.total_expenses)}</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>

    {/* Break-even */}
    {(pnl.break_even_units != null || pnl.break_even_revenue != null) && (
      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-[#fafafa] mb-4">Punto de Equilibrio (Break-even)</p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Gastos fijos del mes</p>
              <p className="font-mono text-xl font-bold text-[#fafafa]">{formatCurrency(pnl.total_expenses)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Contribución prom. por venta</p>
              <p className="font-mono text-xl font-bold text-[#fafafa]">{formatCurrency(pnl.avg_contribution_per_sale)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Unidades para equilibrio</p>
              <p className="font-mono text-2xl font-bold text-blue-400">{pnl.break_even_units ?? '—'}</p>
              <p className="text-xs text-[#52525b] mt-0.5">ventas para no perder plata</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Facturación mínima</p>
              <p className="font-mono text-2xl font-bold text-blue-400">{pnl.break_even_revenue != null ? formatCurrency(pnl.break_even_revenue) : '—'}</p>
              <p className="text-xs text-[#52525b] mt-0.5">para cubrir gastos fijos</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-[#71717a] mb-1.5">
              <span>Progreso este mes</span>
              <span className="font-semibold text-[#fafafa]">{breakEvenProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pnl.revenue >= (pnl.break_even_revenue || 0) ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${breakEvenProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#52525b] mt-2">
              {pnl.break_even_revenue && pnl.revenue >= pnl.break_even_revenue
                ? '✅ Ya cubriste los gastos fijos. Todo lo que vendas de acá en más es ganancia neta.'
                : pnl.break_even_revenue
                ? `Necesitás ${formatCurrency(pnl.break_even_revenue - pnl.revenue)} más para cubrir gastos fijos.`
                : 'Sin gastos fijos registrados en este período.'
              }
            </p>
          </div>
        </CardBody>
      </Card>
    )}
    </div>
  )
}

function MonthlyTab({ monthly, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-[#111114] border border-[#27272a] rounded-xl p-5">
          <Skeleton className="h-[220px] w-full" />
        </div>
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <TableSkeleton rows={6} cols={7} />
        </div>
      </div>
    )
  }

  if (!monthly.length) return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-12 text-center">
      <p className="text-sm text-[#71717a]">Sin datos de comparativo mensual</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-[#fafafa]">Evolución últimos 6 meses</p>
        </CardHeader>
        <CardBody className="pt-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1c1c21', border: '1px solid #27272a', borderRadius: 8 }}
                labelStyle={{ color: '#71717a', fontSize: 11 }}
                formatter={val => formatCurrency(val)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
              <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" name="Gastos totales" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="net_profit" name="Ganancia neta" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#27272a]">
          <p className="text-sm font-semibold text-[#fafafa]">Comparativo mensual</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <tr>
                <Th>Mes</Th>
                <Th>Ingresos</Th>
                <Th>Var.</Th>
                <Th>Gastos totales</Th>
                <Th>Ganancia neta</Th>
                <Th>Var.</Th>
                <Th>Margen</Th>
                <Th>Órdenes</Th>
              </tr>
            </Thead>
            <Tbody>
              {[...monthly].reverse().map(m => (
                <Tr key={`${m.year}-${m.month}`}>
                  <Td className="font-medium capitalize whitespace-nowrap">{m.label}</Td>
                  <Td className="font-mono whitespace-nowrap">{formatCurrency(m.revenue)}</Td>
                  <ChangeCell value={m.revenue_change} />
                  <Td className="font-mono text-red-400 whitespace-nowrap">{formatCurrency(m.expenses)}</Td>
                  <Td>
                    <span className={`font-mono font-semibold whitespace-nowrap ${m.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(m.net_profit)}
                    </span>
                  </Td>
                  <ChangeCell value={m.profit_change} />
                  <Td className="font-mono text-[#a1a1aa]">{m.margin}%</Td>
                  <Td className="font-mono text-[#71717a]">{m.orders}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function ChannelTab({ channels, loading }) {
  if (loading) {
    return (
      <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
        <TableSkeleton rows={5} cols={7} />
      </div>
    )
  }

  if (!channels.length) return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-12 text-center">
      <p className="text-sm text-[#71717a]">Sin datos de ventas por canal en el mes seleccionado</p>
    </div>
  )

  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#27272a]">
        <p className="text-sm font-semibold text-[#fafafa]">Rentabilidad por canal de venta</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Thead>
            <tr>
              <Th>Canal</Th>
              <Th>Órdenes</Th>
              <Th>Ingresos</Th>
              <Th>Share</Th>
              <Th>COGS + fees</Th>
              <Th>Ganancia</Th>
              <Th>Margen</Th>
            </tr>
          </Thead>
          <Tbody>
            {channels.map(c => (
              <Tr key={c.channel}>
                <Td className="font-medium capitalize">{c.channel}</Td>
                <Td className="font-mono text-[#a1a1aa]">{c.orders}</Td>
                <Td className="font-mono whitespace-nowrap">{formatCurrency(c.revenue)}</Td>
                <Td>
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <div className="flex-1 bg-[#27272a] rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${c.share}%` }} />
                    </div>
                    <span className="font-mono text-xs text-[#71717a] flex-shrink-0">{c.share}%</span>
                  </div>
                </Td>
                <Td className="font-mono text-red-400 whitespace-nowrap">−{formatCurrency(c.cogs + c.fees)}</Td>
                <Td>
                  <span className={`font-mono font-semibold whitespace-nowrap ${c.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(c.profit)}
                  </span>
                </Td>
                <Td className="font-mono text-[#a1a1aa]">{c.margin}%</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

export default function Reportes() {
  const [activeTab, setActiveTab] = useState('pnl')
  const [monthly, setMonthly] = useState([])
  const [pnl, setPnl] = useState(null)
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [year, month] = selectedMonth.split('-')
    const from = `${year}-${month}-01`
    const to = `${year}-${month}-31`
    try {
      const [m, p, c] = await Promise.all([
        api.get('/reports/monthly', { months: 6 }),
        api.get('/reports/pnl', { month, year }),
        api.get('/reports/by-channel', { from, to }),
      ])
      setMonthly(m)
      setPnl(p)
      setChannels(c)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 h-9 text-sm text-[#a1a1aa] focus:outline-none focus:border-emerald-500 transition-colors"
        >
          {months.map(m => {
            const [y, mo] = m.split('-')
            const d = new Date(Number(y), Number(mo) - 1, 1)
            return (
              <option key={m} value={m}>
                {d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </option>
            )
          })}
        </select>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">
        <UnderlineTabs
          tabs={REPORT_TABS}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'pnl' && <PnlTab pnl={pnl} loading={loading} />}
        {activeTab === 'monthly' && <MonthlyTab monthly={monthly} loading={loading} />}
        {activeTab === 'channel' && <ChannelTab channels={channels} loading={loading} />}
      </div>
    </div>
  )
}
