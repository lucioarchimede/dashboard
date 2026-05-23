import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, DollarSign, Clock, RefreshCw,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { Header } from '../components/layout/Header'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table'
import { TableSkeleton, CardSkeleton } from '../components/ui/Spinner'
import { api } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/format'

const LINE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

function SummaryCard({ label, value, sub, accent }) {
  const accents = {
    yellow: 'border-l-[3px] border-l-amber-500',
    green:  'border-l-[3px] border-l-emerald-500',
    blue:   'border-l-[3px] border-l-blue-500',
  }
  return (
    <div className={`bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors ${accents[accent] || ''}`}>
      <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">{label}</p>
      <p className="font-mono text-[26px] font-bold text-[#fafafa] leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-[#52525b] mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ pred }) {
  if (pred.days_remaining <= pred.lead_time) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Pedir YA</span>
  }
  if (pred.days_remaining <= pred.lead_time + 7) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Pedir Pronto</span>
  }
  if (pred.avg_daily_sales === 0) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#27272a] text-[#71717a]">Sin movimiento</span>
  }
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">OK</span>
}

function TrendIcon({ value }) {
  if (value > 10) return <TrendingUp size={12} className="text-emerald-400" />
  if (value < -10) return <TrendingDown size={12} className="text-red-400" />
  return <Minus size={12} className="text-[#52525b]" />
}

function RecommendationCard({ rec }) {
  const cfg = {
    high:   { border: 'border-l-red-500',   bg: 'bg-red-500/5',   icon: '⚠️' },
    medium: { border: 'border-l-amber-500', bg: 'bg-amber-500/5', icon: '📈' },
    low:    { border: 'border-l-blue-500',  bg: 'bg-blue-500/5',  icon: '📦' },
  }
  const c = cfg[rec.priority] || cfg.low
  return (
    <div className={`border-l-[3px] ${c.border} ${c.bg} rounded-r-lg px-4 py-3`}>
      <p className="text-sm font-semibold text-[#fafafa] mb-0.5">{c.icon} {rec.title}</p>
      <p className="text-xs text-[#a1a1aa]">{rec.description}</p>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c21] border border-[#27272a] rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-[#52525b] mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#a1a1aa] truncate max-w-[120px]">{p.name}:</span>
          <span className="text-[#fafafa] font-mono font-medium">{p.value} uds</span>
        </div>
      ))}
    </div>
  )
}

export default function StockForecast() {
  const [data, setData] = useState(null)
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [forecast, proj] = await Promise.all([
        api.get('/stock/forecast'),
        api.get('/stock/projection', { days: 30 }),
      ])
      setData(forecast)
      setProjection(proj)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const { summary, predictions = [], recommendations = [] } = data || {}

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button
          onClick={() => load(true)}
          className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <SummaryCard
                label="Alertas de Stock"
                value={summary?.products_needing_reorder ?? 0}
                sub="productos necesitan reorden"
                accent="yellow"
              />
              <SummaryCard
                label="Inversión Sugerida"
                value={formatCurrency(summary?.suggested_investment ?? 0)}
                sub="para el próximo pedido"
                accent="green"
              />
              <SummaryCard
                label="Días hasta reorden"
                value={summary?.days_until_next_reorder != null ? `${summary.days_until_next_reorder}d` : '—'}
                sub="según venta promedio"
                accent="blue"
              />
            </>
          )}
        </div>

        {/* Predictions table */}
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#27272a]">
            <p className="text-sm font-semibold text-[#fafafa]">Análisis por Producto</p>
            <p className="text-xs text-[#52525b] mt-0.5">Basado en ventas de los últimos 30 días</p>
          </div>
          {loading ? (
            <TableSkeleton rows={6} cols={9} />
          ) : predictions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-[#71717a]">Sin productos activos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>Stock actual</Th>
                    <Th>Venta/día</Th>
                    <Th>Días restantes</Th>
                    <Th>Agotamiento</Th>
                    <Th>Pto. reorden</Th>
                    <Th>Cant. sugerida</Th>
                    <Th>Inversión</Th>
                    <Th>Estado</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {predictions.map(pred => (
                    <Tr key={pred.product_id}>
                      <Td>
                        <div>
                          <p className="font-medium text-[#fafafa]">{pred.product_name}</p>
                          {pred.sku && <p className="text-xs text-[#71717a]">{pred.sku}</p>}
                        </div>
                      </Td>
                      <Td className="font-mono text-center">{pred.current_stock}</Td>
                      <Td>
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-[#a1a1aa]">{pred.avg_daily_sales.toFixed(1)}</span>
                          <TrendIcon value={pred.trend} />
                        </div>
                      </Td>
                      <Td className="text-center">
                        <span className={`font-mono font-semibold ${
                          pred.days_remaining <= 7  ? 'text-red-400' :
                          pred.days_remaining <= 14 ? 'text-amber-400' :
                          pred.avg_daily_sales === 0 ? 'text-[#52525b]' : 'text-emerald-400'
                        }`}>
                          {pred.days_remaining >= 999 ? '∞' : `${pred.days_remaining}d`}
                        </span>
                      </Td>
                      <Td className="text-center text-sm text-[#a1a1aa]">
                        {pred.stockout_date ? formatDate(pred.stockout_date) : '—'}
                      </Td>
                      <Td className="font-mono text-center text-[#a1a1aa]">{pred.reorder_point}</Td>
                      <Td className="text-right">
                        <span className={`font-mono font-semibold ${pred.suggested_order_qty > 0 ? 'text-emerald-400' : 'text-[#52525b]'}`}>
                          {pred.suggested_order_qty > 0 ? pred.suggested_order_qty : '—'}
                        </span>
                      </Td>
                      <Td className="font-mono text-right whitespace-nowrap">
                        {pred.order_cost > 0 ? formatCurrency(pred.order_cost) : '—'}
                      </Td>
                      <Td><StatusBadge pred={pred} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>

        {/* Projection chart + Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 30-day projection */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <p className="text-sm font-semibold text-[#fafafa]">Proyección de Stock — próximos 30 días</p>
                <p className="text-xs text-[#52525b] mt-0.5">Top 5 productos por volumen de ventas</p>
              </CardHeader>
              {loading ? (
                <div className="h-[300px] animate-pulse bg-[#18181b] m-5 rounded-lg" />
              ) : projection?.projection?.length > 0 ? (
                <CardBody className="pt-2">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={projection.projection} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#52525b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval={6}
                        tickFormatter={d => {
                          const dt = new Date(d + 'T00:00:00')
                          return dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                        }}
                      />
                      <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: '#a1a1aa', paddingTop: 8 }}
                        formatter={(value) => {
                          const p = projection.products?.find(p => p.key === value)
                          return p ? p.name : value
                        }}
                      />
                      {projection.products?.map((p, i) => (
                        <Line
                          key={p.key}
                          type="monotone"
                          dataKey={p.key}
                          name={p.key}
                          stroke={LINE_COLORS[i % LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                      {projection.products?.map((p, i) => (
                        p.reorder_point > 0 && (
                          <ReferenceLine
                            key={`ref-${p.key}`}
                            y={p.reorder_point}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeDasharray="4 4"
                            strokeOpacity={0.4}
                          />
                        )
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-[#52525b] text-center mt-1">Las líneas punteadas indican el punto de reorden de cada producto</p>
                </CardBody>
              ) : (
                <CardBody>
                  <p className="text-sm text-[#71717a] text-center py-8">Sin ventas recientes para proyectar</p>
                </CardBody>
              )}
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="overflow-hidden">
            <CardHeader>
              <p className="text-sm font-semibold text-[#fafafa]">Recomendaciones</p>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[#18181b] rounded-lg animate-pulse" />
                ))
              ) : recommendations.length > 0 ? (
                recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} />)
              ) : (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-medium text-[#fafafa]">Todo en orden</p>
                  <p className="text-xs text-[#52525b] mt-1">No hay alertas de stock urgentes</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
