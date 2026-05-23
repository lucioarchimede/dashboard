import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trash2, Pencil, X, Megaphone, TrendingUp } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Header } from '../components/layout/Header'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { api } from '../utils/api'
import { formatCurrency, daysAgo, today } from '../utils/format'

const PLATFORMS = ['meta', 'google', 'tiktok', 'instagram', 'otro']
const EMPTY = {
  date: today(), ad_spend: '', impressions: '', clicks: '',
  conversions: '', revenue_attributed: '', leads: '', quiz_completed: '',
  emails_captured: '', platform: 'meta', campaign_name: '', notes: ''
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
      <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">{label}</p>
      <p className="font-mono text-2xl font-bold text-[#fafafa]">{value ?? '—'}</p>
      {sub && <p className="text-xs text-[#52525b] mt-1">{sub}</p>}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111114] border border-[#27272a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] sticky top-0 bg-[#111114] z-10">
          <p className="font-semibold text-[#fafafa] text-sm">{title}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

const inputCls = "w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
const selectCls = `${inputCls} cursor-pointer`

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#71717a] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c21] border border-[#27272a] rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-[#52525b] mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#a1a1aa]">{p.name}:</span>
          <span className="text-[#fafafa] font-mono">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Marketing() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.get('/marketing-metrics', { from, to })
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  function openNew() { setForm({ ...EMPTY, date: today() }); setModal('new') }
  function openEdit(item) { setForm({ ...item }); setModal('edit') }

  async function save() {
    if (!form.date || !form.ad_spend) return
    setSaving(true)
    try {
      if (modal === 'new') await api.post('/marketing-metrics', form)
      else await api.put(`/marketing-metrics/${form.id}`, form)
      setModal(null)
      load(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await api.delete(`/marketing-metrics/${id}`)
    load(true)
  }

  const { summary = {}, data: rows = [], byPlatform = [], daily = [] } = data || {}

  const chartData = daily.map(d => ({
    date: d.date,
    'Inversión': d.spend,
    'Revenue': d.revenue,
  }))

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button onClick={() => load(true)} className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors">
          <Plus size={14} />Registrar
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Inversión Total" value={formatCurrency(summary.total_spend ?? 0)} />
          <KpiCard label="ROAS" value={summary.roas != null ? `${summary.roas}x` : '—'} sub="revenue / ad spend" />
          <KpiCard label="CPA" value={summary.cpa != null ? formatCurrency(summary.cpa) : '—'} sub="costo por conversión" />
          <KpiCard label="CTR" value={summary.ctr != null ? `${summary.ctr}%` : '—'} sub="tasa de clics" />
          <KpiCard label="Impresiones" value={summary.impressions?.toLocaleString('es-AR') ?? '—'} />
          <KpiCard label="Clics" value={summary.clicks?.toLocaleString('es-AR') ?? '—'} />
          <KpiCard label="Conversiones" value={summary.conversions?.toLocaleString('es-AR') ?? '—'} />
          <KpiCard label="Leads" value={summary.leads?.toLocaleString('es-AR') ?? '—'} sub={`CPC: ${summary.cpc != null ? formatCurrency(summary.cpc) : '—'}`} />
        </div>

        {/* Chart + by platform */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#27272a]">
              <p className="text-sm font-semibold text-[#fafafa]">Inversión vs Revenue Atribuido</p>
            </div>
            <div className="p-5">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mgSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="mgRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa', paddingTop: 8 }} />
                    <Area type="monotone" dataKey="Inversión" stroke="#f59e0b" strokeWidth={2} fill="url(#mgSpend)" dot={false} />
                    <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#mgRevenue)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <p className="text-sm text-[#71717a]">Sin datos para graficar</p>
                </div>
              )}
            </div>
          </div>

          {/* By platform */}
          <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#27272a]">
              <p className="text-sm font-semibold text-[#fafafa]">Por Plataforma</p>
            </div>
            <div className="divide-y divide-[#1e1e22]">
              {byPlatform.length === 0 ? (
                <p className="p-5 text-sm text-[#71717a]">Sin datos</p>
              ) : byPlatform.map(p => (
                <div key={p.platform} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[#fafafa] capitalize">{p.platform}</p>
                    <span className="font-mono text-xs text-amber-400">{formatCurrency(p.spend)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#52525b]">
                    <span>{p.clicks?.toLocaleString('es-AR')} clics</span>
                    <span>{p.conversions} conv.</span>
                    {p.spend > 0 && <span className="text-emerald-400">{(p.revenue / p.spend).toFixed(1)}x ROAS</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Records table */}
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#27272a]">
            <p className="text-sm font-semibold text-[#fafafa]">Registros</p>
            <p className="text-xs text-[#52525b] mt-0.5">{rows.length} entradas</p>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone size={32} className="text-[#27272a] mx-auto mb-3" />
              <p className="text-sm text-[#71717a]">Sin datos de marketing en este período</p>
              <button onClick={openNew} className="mt-3 text-xs text-emerald-400 hover:text-emerald-300">
                + Registrar campaña
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272a]">
                    {['Fecha', 'Plataforma', 'Campaña', 'Inversión', 'Impresiones', 'Clics', 'CTR', 'Conv.', 'ROAS', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const ctr = r.impressions > 0 ? (r.clicks / r.impressions * 100).toFixed(1) : '—'
                    const roas = r.ad_spend > 0 ? (r.revenue_attributed / r.ad_spend).toFixed(1) : '—'
                    return (
                      <tr key={r.id} className="border-b border-[#1e1e22] hover:bg-[#18181b]/40 transition-colors">
                        <td className="px-4 py-3 text-sm text-[#a1a1aa]">{r.date}</td>
                        <td className="px-4 py-3 text-sm text-[#fafafa] capitalize">{r.platform}</td>
                        <td className="px-4 py-3 text-sm text-[#a1a1aa] max-w-[160px] truncate">{r.campaign_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-sm text-amber-400">{formatCurrency(r.ad_spend)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#a1a1aa]">{r.impressions?.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#a1a1aa]">{r.clicks?.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#a1a1aa]">{ctr !== '—' ? `${ctr}%` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#a1a1aa]">{r.conversions}</td>
                        <td className="px-4 py-3 font-mono text-sm text-emerald-400">{roas !== '—' ? `${roas}x` : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-colors">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => del(r.id)} className="p-1.5 rounded hover:bg-red-500/10 text-[#71717a] hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nueva Entrada de Marketing' : 'Editar Entrada'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha">
              <input type="date" className={inputCls} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Plataforma">
              <select className={selectCls} value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nombre de Campaña">
            <input type="text" className={inputCls} placeholder="Ej: N001 Awareness Julio"
              value={form.campaign_name} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} />
          </Field>
          <Field label="Inversión (ARS) *">
            <input type="number" className={inputCls} placeholder="0"
              value={form.ad_spend} onChange={e => setForm(f => ({ ...f, ad_spend: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Impresiones">
              <input type="number" className={inputCls} placeholder="0"
                value={form.impressions} onChange={e => setForm(f => ({ ...f, impressions: e.target.value }))} />
            </Field>
            <Field label="Clics">
              <input type="number" className={inputCls} placeholder="0"
                value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: e.target.value }))} />
            </Field>
            <Field label="Conversiones">
              <input type="number" className={inputCls} placeholder="0"
                value={form.conversions} onChange={e => setForm(f => ({ ...f, conversions: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Revenue Atribuido">
              <input type="number" className={inputCls} placeholder="0"
                value={form.revenue_attributed} onChange={e => setForm(f => ({ ...f, revenue_attributed: e.target.value }))} />
            </Field>
            <Field label="Leads">
              <input type="number" className={inputCls} placeholder="0"
                value={form.leads} onChange={e => setForm(f => ({ ...f, leads: e.target.value }))} />
            </Field>
            <Field label="Emails capturados">
              <input type="number" className={inputCls} placeholder="0"
                value={form.emails_captured} onChange={e => setForm(f => ({ ...f, emails_captured: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas opcionales..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <button
            onClick={save}
            disabled={saving || !form.date || !form.ad_spend}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Guardando...' : modal === 'new' ? 'Registrar' : 'Actualizar'}
          </button>
        </Modal>
      )}
    </div>
  )
}
