import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, Receipt, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '../components/layout/Header'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton, CardSkeleton } from '../components/ui/Spinner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { api } from '../utils/api'
import { formatCurrency, formatDate, today, daysAgo } from '../utils/format'

const CATEGORIES = ['Marketing', 'Envíos', 'Plataforma', 'Operativos', 'Impuestos', 'Otros']
const PERIODS = ['mensual', 'semanal', 'anual']

const CAT_COLORS = {
  Marketing: 'blue', Envíos: 'yellow', Plataforma: 'neutral',
  Operativos: 'neutral', Impuestos: 'red', Otros: 'neutral',
}

function validate(form) {
  const errs = {}
  if (!form.description.trim()) errs.description = 'La descripción es requerida'
  if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Ingresá un monto válido'
  if (!form.expense_date) errs.expense_date = 'La fecha es requerida'
  return errs
}

function GastoModal({ isOpen, onClose, initial, onSave }) {
  const isEdit = Boolean(initial?.id)
  const blank = { category: 'Operativos', subcategory: '', description: '', amount: '', is_recurring: false, recurrence_period: 'mensual', expense_date: today() }

  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initial ? { ...initial, amount: String(initial.amount), is_recurring: Boolean(initial.is_recurring) } : blank)
      setErrors({})
    }
  }, [isOpen, initial])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      if (isEdit) {
        await api.put(`/expenses/${initial.id}`, payload)
        toast.success('Gasto actualizado')
      } else {
        await api.post('/expenses', payload)
        toast.success('Gasto registrado')
      }
      onSave()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Nuevo gasto'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          <Input
            label="Subcategoría"
            placeholder="Ej: Google Ads"
            value={form.subcategory}
            onChange={e => set('subcategory', e.target.value)}
          />

          <div className="col-span-2">
            <Input
              label="Descripción *"
              placeholder="Descripción del gasto"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              error={errors.description}
            />
          </div>

          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            error={errors.amount}
          />

          <Input
            label="Fecha *"
            type="date"
            value={form.expense_date}
            onChange={e => set('expense_date', e.target.value)}
            error={errors.expense_date}
          />
        </div>

        <div className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            id="recurring"
            checked={form.is_recurring}
            onChange={e => set('is_recurring', e.target.checked)}
            className="w-4 h-4 rounded border-[#27272a] bg-[#18181b] accent-emerald-500 cursor-pointer"
          />
          <label htmlFor="recurring" className="text-sm text-[#a1a1aa] cursor-pointer select-none">
            Gasto recurrente
          </label>
        </div>

        {form.is_recurring && (
          <Select
            label="Período de recurrencia"
            value={form.recurrence_period}
            onChange={e => set('recurrence_period', e.target.value)}
          >
            {PERIODS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </Select>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Gastos() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [from, setFrom] = useState(daysAgo(179))
  const [to, setTo] = useState(today())
  const [filterCategory, setFilterCategory] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { from, to }
      if (filterCategory) params.category = filterCategory
      const data = await api.get('/expenses', params)
      setExpenses(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [from, to, filterCategory])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(exp) { setEditing(exp); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function onSaved() { closeModal(); load() }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/expenses/${deleteTarget.id}`)
      toast.success('Gasto eliminado')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  function exportCSV() {
    const token = localStorage.getItem('token')
    window.open(`/api/expenses/export/csv?from=${from}&to=${to}&token=${token}`, '_blank')
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download size={14} /> Exportar
        </Button>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Nuevo gasto
        </Button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors col-span-2 lg:col-span-1">
                <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Total del período</p>
                <p className="font-mono text-[22px] font-semibold text-[#fafafa] leading-none mb-1">{formatCurrency(total)}</p>
                <p className="text-xs text-[#52525b]">{expenses.length} registros</p>
              </div>
              {byCategory.slice(0, 3).map(c => (
                <div key={c.cat} className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors">
                  <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">{c.cat}</p>
                  <p className="font-mono text-[22px] font-semibold text-[#fafafa] leading-none mb-1">{formatCurrency(c.total)}</p>
                  <p className="text-xs text-[#52525b]">{total > 0 ? ((c.total / total) * 100).toFixed(0) : 0}% del total</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
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
            <TableSkeleton rows={8} cols={6} />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin gastos en el período"
              description="Registrá tus gastos para tener una visión completa de tu rentabilidad"
              action={openCreate}
              actionLabel="Registrar gasto"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Categoría</Th>
                    <Th>Descripción</Th>
                    <Th>Monto</Th>
                    <Th>Recurrente</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {expenses.map(exp => (
                    <Tr key={exp.id}>
                      <Td className="text-[#71717a] whitespace-nowrap">{formatDate(exp.expense_date)}</Td>
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={CAT_COLORS[exp.category] || 'neutral'}>{exp.category}</Badge>
                          {exp.subcategory && <span className="text-xs text-[#52525b]">{exp.subcategory}</span>}
                        </div>
                      </Td>
                      <Td className="max-w-[220px] truncate">{exp.description}</Td>
                      <Td className="font-mono font-semibold whitespace-nowrap">{formatCurrency(exp.amount)}</Td>
                      <Td>
                        {exp.is_recurring ? (
                          <Badge variant="blue">Recurrente · {exp.recurrence_period}</Badge>
                        ) : (
                          <span className="text-xs text-[#52525b]">Único</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={Pencil}
                            label="Editar"
                            size="sm"
                            onClick={() => openEdit(exp)}
                          />
                          <IconButton
                            icon={Trash2}
                            label="Eliminar"
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteTarget(exp)}
                          />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <GastoModal
        isOpen={modalOpen}
        onClose={closeModal}
        initial={editing}
        onSave={onSaved}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar gasto"
        message={deleteTarget ? `¿Eliminás "${deleteTarget.description}" por ${formatCurrency(deleteTarget.amount)}? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
