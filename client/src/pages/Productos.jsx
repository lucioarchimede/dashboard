import { useState, useEffect, useCallback, Fragment } from 'react'
import { Plus, Package, Search, ChevronDown, ChevronRight, Pencil, PackageMinus, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '../components/layout/Header'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, FormRow, FormSection } from '../components/ui/Input'
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { UnderlineTabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton, CardSkeleton } from '../components/ui/Spinner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { api } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/format'

const CATEGORIES = ['Principal', 'Indumentaria', 'Calzado', 'Accesorios', 'Belleza', 'Electrónica', 'Hogar', 'Otro']

const PRODUCT_TABS = [
  { label: 'Información General', value: 'info' },
  { label: 'Costos & Lote', value: 'costos' },
  { label: 'Inventario', value: 'stock' },
]

function validate(form) {
  const errs = {}
  if (!form.name.trim()) errs.name = 'El nombre es requerido'
  if (!form.cost_price || Number(form.cost_price) < 0) errs.cost_price = 'Ingresá un precio de costo válido'
  if (!form.sale_price || Number(form.sale_price) <= 0) errs.sale_price = 'Ingresá un precio de venta válido'
  return errs
}

function ProductModal({ isOpen, onClose, initial, onSave }) {
  const isEdit = Boolean(initial?.id)
  const blank = {
    name: '', sku: '', category: 'Indumentaria', cost_price: '', sale_price: '',
    current_stock: '0', min_stock: '5', supplier: '',
    aroma: 'Original', variant: 'single',
    import_cost_per_unit: '', packaging_cost: '',
    lot_number: '', expiry_date: ''
  }

  const [tab, setTab] = useState('info')
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTab('info')
      setErrors({})
      setForm(initial ? {
        name: initial.name || '',
        sku: initial.sku || '',
        category: initial.category || 'Indumentaria',
        cost_price: String(initial.cost_price || ''),
        sale_price: String(initial.sale_price || ''),
        current_stock: String(initial.current_stock || 0),
        min_stock: String(initial.min_stock || 5),
        supplier: initial.supplier || '',
        aroma: initial.aroma || 'Original',
        variant: initial.variant || 'single',
        import_cost_per_unit: String(initial.import_cost_per_unit || ''),
        packaging_cost: String(initial.packaging_cost || ''),
        lot_number: initial.lot_number || '',
        expiry_date: initial.expiry_date || '',
      } : blank)
    }
  }, [isOpen, initial])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  const margin = form.sale_price && form.cost_price && Number(form.sale_price) > 0
    ? ((Number(form.sale_price) - Number(form.cost_price)) / Number(form.sale_price) * 100).toFixed(1)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      if (errs.name || errs.cost_price || errs.sale_price) setTab('info')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        current_stock: Number(form.current_stock),
        min_stock: Number(form.min_stock),
        import_cost_per_unit: form.import_cost_per_unit ? Number(form.import_cost_per_unit) : 0,
        packaging_cost: form.packaging_cost ? Number(form.packaging_cost) : 0,
      }
      if (isEdit) {
        await api.put(`/products/${initial.id}`, payload)
        toast.success('Producto actualizado')
      } else {
        await api.post('/products', payload)
        toast.success('Producto creado')
      }
      onSave()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <UnderlineTabs tabs={PRODUCT_TABS} value={tab} onChange={setTab} />

        {tab === 'info' && (
          <div className="flex flex-col gap-4">
            <FormSection title="Identificación">
              <Input
                label="Nombre del producto *"
                placeholder="Ej: Remera Básica Blanca"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                error={errors.name}
              />
              <FormRow>
                <Input
                  label="SKU"
                  placeholder="Ej: REM-BLC-001"
                  value={form.sku}
                  onChange={e => set('sku', e.target.value)}
                />
                <Select
                  label="Categoría"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormRow>
              <Input
                label="Proveedor"
                placeholder="Nombre del proveedor"
                value={form.supplier}
                onChange={e => set('supplier', e.target.value)}
              />
            </FormSection>

            <FormSection title="Precios">
              <FormRow>
                <Input
                  label="Precio de costo *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={e => set('cost_price', e.target.value)}
                  error={errors.cost_price}
                />
                <Input
                  label="Precio de venta *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.sale_price}
                  onChange={e => set('sale_price', e.target.value)}
                  error={errors.sale_price}
                />
              </FormRow>

              {margin !== null && (
                <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${Number(margin) >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <span className="text-sm text-[#a1a1aa]">Margen calculado</span>
                  <span className={`font-mono text-lg font-bold ${Number(margin) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {margin}%
                  </span>
                </div>
              )}
            </FormSection>
          </div>
        )}

        {tab === 'costos' && (
          <div className="flex flex-col gap-4">
            <FormSection title="Desglose de costos">
              <FormRow>
                <Input
                  label="Costo importación/unidad"
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.import_cost_per_unit}
                  onChange={e => set('import_cost_per_unit', e.target.value)}
                />
                <Input
                  label="Costo packaging/unidad"
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.packaging_cost}
                  onChange={e => set('packaging_cost', e.target.value)}
                />
              </FormRow>
            </FormSection>
            <FormSection title="Variante">
              <FormRow>
                <Input
                  label="Aroma / Variante"
                  placeholder="Ej: Original, Lavanda, Cítrico"
                  value={form.aroma}
                  onChange={e => set('aroma', e.target.value)}
                />
                <Select
                  label="Tipo"
                  value={form.variant}
                  onChange={e => set('variant', e.target.value)}
                >
                  <option value="single">Individual</option>
                  <option value="pack2">Pack x2</option>
                  <option value="pack3">Pack x3</option>
                  <option value="bundle">Bundle</option>
                </Select>
              </FormRow>
            </FormSection>
            <FormSection title="Lote">
              <FormRow>
                <Input
                  label="Número de lote"
                  placeholder="Ej: LOT-2024-001"
                  value={form.lot_number}
                  onChange={e => set('lot_number', e.target.value)}
                />
                <Input
                  label="Fecha de vencimiento"
                  type="date"
                  value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)}
                />
              </FormRow>
            </FormSection>
          </div>
        )}

        {tab === 'stock' && (
          <div className="flex flex-col gap-4">
            <FormSection title="Control de stock">
              <FormRow>
                <Input
                  label={isEdit ? 'Stock actual (solo lectura)' : 'Stock inicial'}
                  type="number"
                  min="0"
                  value={form.current_stock}
                  onChange={e => set('current_stock', e.target.value)}
                  disabled={isEdit}
                />
                <Input
                  label="Stock mínimo (alerta)"
                  type="number"
                  min="0"
                  value={form.min_stock}
                  onChange={e => set('min_stock', e.target.value)}
                />
              </FormRow>
              {isEdit && (
                <p className="text-xs text-[#71717a] bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2.5">
                  Para modificar el stock usá el botón "Ajustar stock" en la tabla.
                </p>
              )}
            </FormSection>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function StockAdjustModal({ isOpen, onClose, product, onSave }) {
  const [form, setForm] = useState({ type: 'entrada', quantity: '1', reason: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) setForm({ type: 'entrada', quantity: '1', reason: '' })
  }, [isOpen])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.quantity || Number(form.quantity) < 1) return
    setLoading(true)
    try {
      await api.post('/stock/adjust', { product_id: product.id, ...form, quantity: Number(form.quantity) })
      toast.success('Stock ajustado correctamente')
      onSave()
    } catch (err) {
      toast.error(err.message || 'Error al ajustar stock')
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar stock" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
          <p className="text-sm font-medium text-[#fafafa]">{product.name}</p>
          <p className="text-xs text-[#71717a] mt-0.5">Stock actual: <span className="font-mono font-semibold text-[#fafafa]">{product.current_stock}</span></p>
        </div>

        <Select
          label="Tipo de movimiento"
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        >
          <option value="entrada">Entrada (sumar al stock)</option>
          <option value="salida">Salida (restar del stock)</option>
          <option value="ajuste">Ajuste manual</option>
        </Select>

        <Input
          label="Cantidad *"
          type="number"
          min="1"
          value={form.quantity}
          onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
        />

        <Input
          label="Motivo"
          placeholder="Ej: Compra proveedor, merma, inventario"
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Ajustar stock</Button>
        </div>
      </form>
    </Modal>
  )
}

function MovementsPanel({ productId }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stock/movements', { product_id: productId })
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return <div className="px-6 py-3 text-xs text-[#71717a]">Cargando movimientos...</div>
  }

  return (
    <div className="px-6 py-3 bg-[#0d0d10]">
      <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Historial de movimientos</p>
      {movements.length === 0 ? (
        <p className="text-xs text-[#52525b] py-1">Sin movimientos registrados</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {movements.slice(0, 8).map(m => (
            <div key={m.id} className="flex items-center gap-4 text-xs">
              <span className="text-[#71717a] w-20 flex-shrink-0">{formatDate(m.movement_date)}</span>
              <span className="text-[#a1a1aa] flex-1 truncate">{m.reason}</span>
              <span className={`font-mono font-semibold flex-shrink-0 ${m.type === 'salida' ? 'text-red-400' : 'text-emerald-400'}`}>
                {m.type === 'salida' ? '-' : '+'}{m.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Productos() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filterCategory) params.category = filterCategory
      const data = await api.get('/products', params)
      setProducts(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(p) { setEditing(p); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function openAdjust(p) { setAdjustProduct(p); setAdjustOpen(true) }
  function closeAdjust() { setAdjustOpen(false); setAdjustProduct(null) }
  function onSaved() { closeModal(); load() }
  function onAdjusted() { closeAdjust(); load() }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await api.delete(`/products/${deactivateTarget.id}`)
      toast.success('Producto desactivado')
      setDeactivateTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Error al desactivar')
    } finally {
      setDeactivating(false)
    }
  }

  const activeProducts = products.filter(p => p.is_active)
  const stockAlerts = products.filter(p => p.current_stock <= p.min_stock && p.is_active)
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.current_stock, 0)
  const avgMargin = activeProducts.length > 0
    ? (activeProducts.reduce((s, p) => s + Number(p.margin || 0), 0) / activeProducts.length).toFixed(1)
    : '0.0'

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        {stockAlerts.length > 0 && (
          <Badge variant="yellow">{stockAlerts.length} con stock bajo</Badge>
        )}
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Nuevo producto
        </Button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
                <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Productos activos</p>
                <p className="font-mono text-[22px] font-semibold text-[#fafafa] leading-none">{activeProducts.length}</p>
              </div>
              <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
                <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Valor inventario</p>
                <p className="font-mono text-[22px] font-semibold text-[#fafafa] leading-none">{formatCurrency(inventoryValue)}</p>
              </div>
              <div className={`bg-[#111114] rounded-xl p-5 transition-colors ${stockAlerts.length > 0 ? 'border border-amber-500/30 hover:border-amber-500/50' : 'border border-[#27272a] hover:border-[#3f3f46]'}`}>
                <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Stock bajo / agotado</p>
                <p className={`font-mono text-[22px] font-semibold leading-none ${stockAlerts.length > 0 ? 'text-amber-400' : 'text-[#fafafa]'}`}>{stockAlerts.length}</p>
              </div>
              <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
                <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Margen promedio</p>
                <p className="font-mono text-[22px] font-semibold text-emerald-400 leading-none">{avgMargin}%</p>
              </div>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 h-9 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 h-9 text-sm text-[#a1a1aa] focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin productos"
              description="Creá tu primer producto para empezar a registrar ventas"
              action={openCreate}
              actionLabel="Crear producto"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th className="w-8"></Th>
                    <Th>Producto</Th>
                    <Th>Categoría</Th>
                    <Th>Costo</Th>
                    <Th>Precio venta</Th>
                    <Th>Margen</Th>
                    <Th>ROI</Th>
                    <Th>Stock</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {products.map(p => (
                    <Fragment key={p.id}>
                      <Tr
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      >
                        <Td className="w-8">
                          {expandedId === p.id
                            ? <ChevronDown size={14} className="text-[#52525b]" />
                            : <ChevronRight size={14} className="text-[#52525b]" />}
                        </Td>
                        <Td>
                          <div>
                            <p className={`font-medium ${!p.is_active ? 'text-[#52525b] line-through' : ''}`}>{p.name}</p>
                            {p.sku && <p className="text-xs text-[#71717a]">{p.sku}</p>}
                          </div>
                        </Td>
                        <Td><Badge variant="neutral">{p.category}</Badge></Td>
                        <Td className="font-mono text-[#a1a1aa] whitespace-nowrap">{formatCurrency(p.cost_price)}</Td>
                        <Td className="font-mono whitespace-nowrap">{formatCurrency(p.sale_price)}</Td>
                        <Td>
                          <span className={`font-mono font-semibold text-sm ${Number(p.margin) >= 30 ? 'text-emerald-400' : Number(p.margin) >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                            {p.margin}%
                          </span>
                        </Td>
                        <Td>
                          {p.cost_price > 0 && (() => {
                            const roi = Math.round((p.sale_price - p.cost_price) / p.cost_price * 100)
                            return (
                              <span className={`font-mono font-semibold text-sm ${roi >= 100 ? 'text-emerald-400' : roi >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {roi}%
                              </span>
                            )
                          })()}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={p.stock_status} />
                            <span className="font-mono text-sm text-[#fafafa]">{p.current_stock}</span>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            <IconButton
                              icon={Layers}
                              label="Ajustar stock"
                              size="sm"
                              onClick={e => { e.stopPropagation(); openAdjust(p) }}
                            />
                            <IconButton
                              icon={Pencil}
                              label="Editar"
                              size="sm"
                              onClick={e => { e.stopPropagation(); openEdit(p) }}
                            />
                            {p.is_active && (
                              <IconButton
                                icon={PackageMinus}
                                label="Desactivar"
                                size="sm"
                                variant="danger"
                                onClick={e => { e.stopPropagation(); setDeactivateTarget(p) }}
                              />
                            )}
                          </div>
                        </Td>
                      </Tr>
                      {expandedId === p.id && (
                        <tr>
                          <td colSpan="9" className="p-0 border-b border-[#1e1e22]">
                            <MovementsPanel productId={p.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={closeModal}
        initial={editing}
        onSave={onSaved}
      />

      <StockAdjustModal
        isOpen={adjustOpen}
        onClose={closeAdjust}
        product={adjustProduct}
        onSave={onAdjusted}
      />

      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Desactivar producto"
        message={deactivateTarget ? `¿Desactivás "${deactivateTarget.name}"? El producto no aparecerá en nuevas ventas pero se conservará el historial.` : ''}
        confirmLabel="Desactivar"
      />
    </div>
  )
}
