import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trash2, Pencil, X, Wallet } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Header } from '../components/layout/Header'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { api } from '../utils/api'
import { formatCurrency, daysAgo, today } from '../utils/format'

const TIPOS = ['ingreso', 'egreso']
const CUENTAS = ['banco', 'efectivo', 'mercadopago', 'otro']
const ESTADOS = ['pagado', 'pendiente', 'cancelado']
const CATEGORIAS_INGRESO = ['ventas', 'transferencia', 'devolución', 'otro ingreso']
const CATEGORIAS_EGRESO = ['proveedor', 'publicidad', 'logística', 'salarios', 'impuestos', 'servicios', 'otro egreso']

const EMPTY = {
  date: today(), type: 'egreso', category: '', amount: '',
  description: '', account: 'banco', status: 'pagado', notes: ''
}

function StatCard({ label, value, color }) {
  const colors = { emerald: 'text-emerald-400', red: 'text-red-400', blue: 'text-blue-400' }
  return (
    <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
      <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">{label}</p>
      <p className={`font-mono text-2xl font-bold ${colors[color] || 'text-[#fafafa]'}`}>{value}</p>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-[#111114] border border-[#27272a] rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#71717a] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
const selectCls = `${inputCls} cursor-pointer`

export default function CashFlow() {
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
      const res = await api.get('/cash-flow', { from, to, limit: 200 })
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(EMPTY); setModal('new') }
  function openEdit(item) { setForm({ ...item }); setModal('edit') }

  async function save() {
    if (!form.date || !form.type || !form.category || !form.amount) return
    setSaving(true)
    try {
      if (modal === 'new') await api.post('/cash-flow', form)
      else await api.put(`/cash-flow/${form.id}`, form)
      setModal(null)
      load(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await api.delete(`/cash-flow/${id}`)
    load(true)
  }

  const { summary = {}, data: rows = [], byAccount = [] } = data || {}
  const cats = form.type === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button onClick={() => load(true)} className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />Nuevo
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Ingresos" value={formatCurrency(summary.ingresos ?? 0)} color="emerald" />
          <StatCard label="Egresos" value={formatCurrency(summary.egresos ?? 0)} color="red" />
          <StatCard label="Balance Neto" value={formatCurrency(summary.balance ?? 0)} color="blue" />
        </div>

        {/* By account */}
        {byAccount.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {byAccount.map(a => (
              <div key={a.account} className="bg-[#111114] border border-[#27272a] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#52525b] capitalize mb-2">{a.account}</p>
                <p className={`font-mono text-lg font-bold ${a.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(a.balance)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#fafafa]">Movimientos</p>
              <p className="text-xs text-[#52525b] mt-0.5">{rows.length} registros</p>
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet size={32} className="text-[#27272a] mx-auto mb-3" />
              <p className="text-sm text-[#71717a]">Sin movimientos en este período</p>
              <button onClick={openNew} className="mt-3 text-xs text-emerald-400 hover:text-emerald-300">
                + Registrar movimiento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272a]">
                    {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Cuenta', 'Estado', 'Importe', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-[#1e1e22] hover:bg-[#18181b]/40 transition-colors">
                      <td className="px-4 py-3 text-sm text-[#a1a1aa]">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.type === 'ingreso'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a1a1aa] capitalize">{r.category}</td>
                      <td className="px-4 py-3 text-sm text-[#fafafa] max-w-[200px] truncate">{r.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1aa] capitalize">{r.account}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'pagado' ? 'bg-[#27272a] text-[#71717a]'
                          : r.status === 'pendiente' ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-[#27272a] text-[#52525b]'
                        }`}>{r.status}</span>
                      </td>
                      <td className={`px-4 py-3 font-mono text-sm font-semibold text-right ${
                        r.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {r.type === 'ingreso' ? '+' : '-'}{formatCurrency(r.amount)}
                      </td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo Movimiento' : 'Editar Movimiento'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha">
              <input type="date" className={inputCls} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Tipo">
              <select className={selectCls} value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value, category: '' }))}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Categoría">
            <select className={selectCls} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Importe (ARS)">
            <input type="number" className={inputCls} placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cuenta">
              <select className={selectCls} value={form.account}
                onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className={selectCls} value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descripción">
            <input type="text" className={inputCls} placeholder="Descripción..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Notas">
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas opcionales..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <button
            onClick={save}
            disabled={saving || !form.date || !form.type || !form.category || !form.amount}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Guardando...' : modal === 'new' ? 'Registrar' : 'Actualizar'}
          </button>
        </Modal>
      )}
    </div>
  )
}
