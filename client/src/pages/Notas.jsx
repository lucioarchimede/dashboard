import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trash2, Pencil, X, StickyNote, Tag } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Header } from '../components/layout/Header'
import { api } from '../utils/api'
import { today } from '../utils/format'

const EMPTY = { date: today(), title: '', content: '', tags: '' }

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111114] border border-[#27272a] rounded-xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}>
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

const inputCls = "w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"

function NoteCard({ note, onEdit, onDelete }) {
  const tags = note.tags ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  return (
    <div className="bg-[#111114] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-5 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && <p className="font-semibold text-[#fafafa] text-sm mb-0.5">{note.title}</p>}
          <p className="text-xs text-[#52525b]">{note.date}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(note)} className="p-1.5 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(note.id)} className="p-1.5 rounded hover:bg-red-500/10 text-[#71717a] hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{note.content}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#27272a] text-[#71717a]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Notas() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.get('/notes', {
        search: search || undefined,
        tag: activeTag || undefined,
      })
      setNotes(Array.isArray(res) ? res : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [search, activeTag])

  useEffect(() => { load() }, [load])

  function openNew() { setForm({ ...EMPTY, date: today() }); setModal('new') }
  function openEdit(note) { setForm({ ...note }); setModal('edit') }

  async function save() {
    if (!form.date || !form.content) return
    setSaving(true)
    try {
      if (modal === 'new') await api.post('/notes', form)
      else await api.put(`/notes/${form.id}`, form)
      setModal(null)
      load(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('¿Eliminar esta nota?')) return
    await api.delete(`/notes/${id}`)
    load(true)
  }

  // Collect all unique tags
  const allTags = [...new Set(
    notes.flatMap(n => n.tags ? n.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
  )]

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <button onClick={() => load(true)} className="p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors">
          <Plus size={14} />Nueva Nota
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-5 max-w-[1200px] w-full mx-auto">

        {/* Search + tag filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111114] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors w-full max-w-xs"
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTag('')}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  !activeTag ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                Todas
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    activeTag === tag ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-[#111114] border border-[#27272a] rounded-xl p-12 text-center">
            <StickyNote size={32} className="text-[#27272a] mx-auto mb-3" />
            <p className="text-sm text-[#71717a]">Sin notas todavía</p>
            <button onClick={openNew} className="mt-3 text-xs text-emerald-400 hover:text-emerald-300">
              + Crear primera nota
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={del} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nueva Nota' : 'Editar Nota'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#71717a] mb-1.5">Fecha</label>
              <input type="date" className={inputCls} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71717a] mb-1.5">Título (opcional)</label>
              <input type="text" className={inputCls} placeholder="Ej: Reunión con proveedor"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717a] mb-1.5">Contenido *</label>
            <textarea className={`${inputCls} resize-none`} rows={6} placeholder="Escribe tu nota aquí..."
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717a] mb-1.5">
              <Tag size={11} className="inline mr-1" />
              Tags (separados por coma)
            </label>
            <input type="text" className={inputCls} placeholder="proveedor, decisión, meta..."
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <button
            onClick={save}
            disabled={saving || !form.date || !form.content}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Guardando...' : modal === 'new' ? 'Crear Nota' : 'Actualizar'}
          </button>
        </Modal>
      )}
    </div>
  )
}
