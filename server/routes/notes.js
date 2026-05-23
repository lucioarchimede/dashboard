const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const { search, tag, from, to } = req.query
  let where = 'WHERE 1=1'
  const params = []
  if (from)   { where += ' AND date >= ?'; params.push(from) }
  if (to)     { where += ' AND date <= ?'; params.push(to) }
  if (tag)    { where += " AND (',' || tags || ',') LIKE ?"; params.push(`%,${tag},%`) }
  if (search) { where += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  const data = db.prepare(`SELECT * FROM business_notes ${where} ORDER BY date DESC, created_at DESC`).all(...params)
  res.json(data)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { date, title, content, tags } = req.body
  if (!content || !date) return res.status(400).json({ error: 'Contenido y fecha son requeridos' })
  const result = db.prepare(
    'INSERT INTO business_notes (date, title, content, tags) VALUES (?, ?, ?, ?)'
  ).run(date, title || null, content, tags || null)
  res.status(201).json(db.prepare('SELECT * FROM business_notes WHERE id = ?').get(result.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM business_notes WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Nota no encontrada' })
  const { date, title, content, tags } = req.body
  db.prepare(`
    UPDATE business_notes SET date=?, title=?, content=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    date ?? existing.date, title ?? existing.title, content ?? existing.content,
    tags ?? existing.tags, req.params.id
  )
  res.json(db.prepare('SELECT * FROM business_notes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM business_notes WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Nota no encontrada' })
  }
  db.prepare('DELETE FROM business_notes WHERE id = ?').run(req.params.id)
  res.json({ message: 'Nota eliminada' })
})

module.exports = router
