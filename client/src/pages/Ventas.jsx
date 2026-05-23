import { useState, useCallback, useEffect } from 'react'
import { Plus, Download, ShoppingCart, Search, Edit2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '../components/layout/Header'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input, Select, Textarea, FormRow, FormSection } from '../components/ui/Input'
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Spinner'
import { Pagination } from '../components/ui/Pagination'
import { Card } from '../components/ui/Card'
import { api } from '../utils/api'
import { formatCurrency, formatDate, today, daysAgo } from '../utils/format'

const CHANNELS = ['shopify', 'mercadolibre', 'instagram', 'whatsapp', 'otro']
const PAYMENTS = [
  'Transferencia Bancaria',
  'MercadoPago (Débito)',
  'MercadoPago (Crédito 1 cuota)',
  'MercadoPago (Crédito 3 cuotas)',
  'MercadoPago (Crédito 6 cuotas)',
  'Efectivo',
  'Otro',
]
const STATUSES = ['completada', 'pendiente', 'cancelada']

const EMPTY_FORM = {
  product_id: '', quantity: '1', unit_price: '', discount: '0', shipping_cost: '0',
  platform_fee: '0', payment_fee: '0', mp_commission_percent: '0', channel: 'shopify',
  customer_name: '', customer_email: '', customer_phone: '', payment_method: 'Transferencia Bancaria',
  status: 'completada', notes: '', sale_date: today()
}

function SaleModal({ isOpen, onClose, onSaved, products, initial }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const isEdit = !!initial?.id

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setForm(initial ? {
        product_id: String(initial.product_id || ''),
        quantity: String(initial.quantity || '1'),
        unit_price: String(initial.unit_price || ''),
        discount: String(initial.discount || '0'),
        shipping_cost: String(initial.shipping_cost || '0'),
        platform_fee: String(initial.platform_fee || '0'),
        payment_fee: String(initial.payment_fee || '0'),
        mp_commission_percent: String(initial.mp_commission_percent || '0'),
        channel: initial.channel || 'shopify',
        customer_name: initial.customer_name || '',
        customer_email: initial.customer_email || '',
        customer_phone: initial.customer_phone || '',
        payment_method: initial.payment_method || 'Transferencia Bancaria',
        status: initial.status || 'completada',
        notes: initial.notes || '',
        sale_date: initial.sale_date || today()
      } : EMPTY_FORM)
    }
  }, [isOpen, initial])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  function handleProductChange(id) {
    const p = products.find(pr => pr.id === Number(id))
    setForm(f => ({ ...f, product_id: id, unit_price: p ? String(p.sale_price) : '' }))
    setErrors(e => ({ ...e, product_id: undefined, unit_price: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.product_id) e.product_id = 'Requerido'
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Debe ser > 0'
    if (!form.unit_price || Number(form.unit_price) <= 0) e.unit_price = 'Requerido'
    if (!form.sale_date) e.sale_date = 'Requerido'
    return e
  }

  const selectedProduct = products.find(p => p.id === Number(form.product_id))
  const qty = Number(form.quantity) || 0
  const price = Number(form.unit_price) || 0
  const profit = selectedProduct
    ? (price * qty) - (selectedProduct.cost_price * qty) - Number(form.shipping_cost) - Number(form.platform_fee) - Number(form.payment_fee)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        discount: Number(form.discount) || 0,
        shipping_cost: Number(form.shipping_cost),
        platform_fee: Number(form.platform_fee),
        payment_fee: Number(form.payment_fee),
        mp_commission_percent: Number(form.mp_commission_percent) || 0,
      }
      if (isEdit) await api.put(`/sales/${initial.id}`, payload)
      else await api.post('/sales', payload)
      toast.success(isEdit ? 'Venta actualizada' : 'Venta registrada')
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar venta' : 'Nueva venta'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormSection title="Producto">
          <Select label="Producto *" value={form.product_id} onChange={e => handleProductChange(e.target.value)} error={errors.product_id}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} — Stock: {p.current_stock}</option>)}
          </Select>
          <FormRow>
            <Input label="Cantidad *" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} error={errors.quantity} />
            <Input label="Precio unitario *" type="number" min="0" step="0.01" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} error={errors.unit_price} />
          </FormRow>
        </FormSection>

        <FormSection title="Descuento & Costos">
          <FormRow cols={2}>
            <Input label="Descuento" type="number" min="0" value={form.discount} onChange={e => set('discount', e.target.value)} />
            <Input label="Envío" type="number" min="0" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} />
          </FormRow>
          <FormRow cols={3}>
            <Input label="Com. plataforma" type="number" min="0" value={form.platform_fee} onChange={e => set('platform_fee', e.target.value)} />
            <Input label="Com. pago (fija)" type="number" min="0" value={form.payment_fee} onChange={e => set('payment_fee', e.target.value)} />
            <Input label="Com. MP %" type="number" min="0" max="100" step="0.1" value={form.mp_commission_percent} onChange={e => set('mp_commission_percent', e.target.value)} />
          </FormRow>
        </FormSection>

        <FormSection title="Detalles">
          <FormRow>
            <Select label="Canal" value={form.channel} onChange={e => set('channel', e.target.value)}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Medio de pago" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormRow>
          <FormRow>
            <Select label="Estado" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Fecha *" type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} error={errors.sale_date} />
          </FormRow>
          <FormRow cols={3}>
            <Input label="Cliente" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
            <Input label="Email" type="email" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
            <Input label="Teléfono" type="tel" placeholder="+54911..." value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} />
          </FormRow>
          <Textarea label="Notas" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </FormSection>

        {profit !== null && (
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${profit >= 0 ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-red-500/8 border border-red-500/20'}`}>
            <span className="text-sm text-[#a1a1aa]">Ganancia estimada</span>
            <span className={`font-mono font-bold text-base ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(profit)}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>{isEdit ? 'Guardar cambios' : 'Registrar venta'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Ventas() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editSale, setEditSale] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [from, setFrom] = useState(daysAgo(179))
  const [to, setTo] = useState(today())
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { from, to, page, limit }
      if (filterChannel) params.channel = filterChannel
      if (filterStatus) params.status = filterStatus
      const [s, p] = await Promise.all([
        api.get('/sales', params),
        products.length ? Promise.resolve(products) : api.get('/products', { active: 'true' })
      ])
      setSales(s.data || [])
      setTotal(s.total || 0)
      if (!products.length) setProducts(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [from, to, page, limit, filterChannel, filterStatus])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [from, to, filterChannel, filterStatus])

  async function handleCancel() {
    setCancelLoading(true)
    try {
      await api.patch(`/sales/${cancelTarget}/cancel`)
      toast.success('Venta cancelada')
      setCancelTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCancelLoading(false)
    }
  }

  const displayed = search
    ? sales.filter(s => s.product_name?.toLowerCase().includes(search.toLowerCase()) || s.customer_name?.toLowerCase().includes(search.toLowerCase()))
    : sales

  const totals = sales.filter(s => s.status === 'completada').reduce((a, s) => ({
    revenue: a.revenue + s.total,
    profit: a.profit + (s.profit || 0)
  }), { revenue: 0, profit: 0 })

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <Button variant="secondary" size="sm" icon={Download} onClick={() => window.open(`/api/sales/export/csv?from=${from}&to=${to}`, '_blank')}>
          Exportar
        </Button>
        <Button size="sm" icon={Plus} onClick={() => { setEditSale(null); setModalOpen(true) }}>
          Nueva venta
        </Button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ingresos del período', value: formatCurrency(totals.revenue), mono: true },
            { label: 'Ganancia del período', value: formatCurrency(totals.profit), mono: true, accent: totals.profit >= 0 ? 'green' : 'red' },
            { label: 'Órdenes completadas', value: sales.filter(s => s.status === 'completada').length, mono: true },
            { label: 'Ticket promedio', value: formatCurrency(sales.filter(s => s.status === 'completada').length > 0 ? totals.revenue / sales.filter(s => s.status === 'completada').length : 0), mono: true },
          ].map(stat => (
            <div key={stat.label} className={`bg-[#111114] border ${stat.accent === 'green' ? 'border-emerald-500/30' : stat.accent === 'red' ? 'border-red-500/30' : 'border-[#27272a]'} rounded-xl p-4`}>
              <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-wider mb-1.5">{stat.label}</p>
              <p className={`font-mono text-xl font-bold ${stat.accent === 'green' ? 'text-emerald-400' : stat.accent === 'red' ? 'text-red-400' : 'text-[#fafafa]'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-9 bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 text-sm text-[#fafafa] placeholder-[#3f3f46] focus:outline-none focus:border-emerald-500/70 transition-colors w-44"
            />
          </div>
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="h-9 bg-[#18181b] border border-[#27272a] rounded-lg px-3 text-sm text-[#a1a1aa] focus:outline-none focus:border-emerald-500/70">
            <option value="">Todos los canales</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 bg-[#18181b] border border-[#27272a] rounded-lg px-3 text-sm text-[#a1a1aa] focus:outline-none focus:border-emerald-500/70">
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Sin ventas en el período"
              description="Cargá tu primera venta para ver las métricas de rentabilidad"
              action={() => { setEditSale(null); setModalOpen(true) }}
              actionLabel="Registrar venta"
              actionIcon={Plus}
            />
          ) : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Producto</Th>
                    <Th align="right">Cant.</Th>
                    <Th align="right">Precio</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Costos</Th>
                    <Th align="right">Ganancia</Th>
                    <Th>Canal</Th>
                    <Th>Estado</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {displayed.map(s => {
                    const costs = ((s.cost_price || 0) * s.quantity) + s.shipping_cost + s.platform_fee + s.payment_fee
                    const profitPos = (s.profit || 0) >= 0
                    return (
                      <Tr key={s.id}>
                        <Td muted>{formatDate(s.sale_date)}</Td>
                        <Td>
                          <div>
                            <p className="text-sm font-medium text-[#fafafa] leading-tight">{s.product_name}</p>
                            {s.sku && <p className="text-[11px] text-[#52525b]">{s.sku}</p>}
                          </div>
                        </Td>
                        <Td align="right" className="font-mono">{s.quantity}</Td>
                        <Td align="right" muted className="font-mono">{formatCurrency(s.unit_price)}</Td>
                        <Td align="right" className="font-mono font-medium">{formatCurrency(s.total)}</Td>
                        <Td align="right" muted className="font-mono">{formatCurrency(costs)}</Td>
                        <Td align="right">
                          <span className={`font-mono font-semibold text-sm ${profitPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(s.profit || 0)}
                          </span>
                        </Td>
                        <Td><Badge variant="neutral">{s.channel}</Badge></Td>
                        <Td><StatusBadge status={s.status} /></Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            <IconButton
                              icon={Edit2}
                              label="Editar"
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditSale(s); setModalOpen(true) }}
                            />
                            {s.status !== 'cancelada' && (
                              <IconButton
                                icon={XCircle}
                                label="Cancelar"
                                size="sm"
                                variant="ghost"
                                className="hover:text-red-400"
                                onClick={() => setCancelTarget(s.id)}
                              />
                            )}
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
              <Pagination
                page={page}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={n => { setLimit(n); setPage(1) }}
              />
            </>
          )}
        </Card>
      </div>

      <SaleModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditSale(null) }}
        onSaved={() => { setModalOpen(false); setEditSale(null); load() }}
        products={products}
        initial={editSale}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelLoading}
        title="Cancelar venta"
        message="Esta acción revertirá el stock del producto. ¿Confirmar cancelación?"
        confirmLabel="Cancelar venta"
      />
    </div>
  )
}
