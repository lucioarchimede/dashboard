const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

// GET /api/cash-flow — list with filters + balance summary
router.get('/', (req, res) => {
  const db = getDb()
  const { from, to, type, category, account, page = 1, limit = 50 } = req.query

  let where = 'WHERE 1=1'
  const params = []
  if (from)     { where += ' AND date >= ?'; params.push(from) }
  if (to)       { where += ' AND date <= ?'; params.push(to) }
  if (type)     { where += ' AND type = ?'; params.push(type) }
  if (category) { where += ' AND category = ?'; params.push(category) }
  if (account)  { where += ' AND account = ?'; params.push(account) }

  const total = db.prepare(`SELECT COUNT(*) as n FROM cash_flow ${where}`).get(...params).n
  const data = db.prepare(`
    SELECT * FROM cash_flow ${where}
    ORDER BY date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), (Number(page) - 1) * Number(limit))

  const summary = db.prepare(`
    SELECT
      account,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE 0 END) as ingresos,
      SUM(CASE WHEN type='egreso' THEN amount ELSE 0 END) as egresos,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END) as balance
    FROM cash_flow ${where}
    GROUP BY account
  `).all(...params)

  res.json({ data, total, page: Number(page), limit: Number(limit), summary })
})

// POST /api/cash-flow
router.post('/', (req, res) => {
  const db = getDb()
  const { date, type, category, amount, description, account = 'banco', status = 'pagado', notes } = req.body
  if (!date || !type || !category || amount === undefined) {
    return res.status(400).json({ error: 'Fecha, tipo, categoría e importe son requeridos' })
  }
  const result = db.prepare(`
    INSERT INTO cash_flow (date, type, category, amount, description, account, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, type, category, amount, description || null, account, status, notes || null)
  res.status(201).json(db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(result.lastInsertRowid))
})

// PUT /api/cash-flow/:id
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' })

  const { date, type, category, amount, description, account, status, notes } = req.body
  db.prepare(`
    UPDATE cash_flow SET date=?, type=?, category=?, amount=?, description=?, account=?, status=?, notes=?
    WHERE id=?
  `).run(
    date ?? existing.date, type ?? existing.type, category ?? existing.category,
    amount ?? existing.amount, description ?? existing.description,
    account ?? existing.account, status ?? existing.status, notes ?? existing.notes,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(req.params.id))
})

// DELETE /api/cash-flow/:id
router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM cash_flow WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' })
  db.prepare('DELETE FROM cash_flow WHERE id = ?').run(req.params.id)
  res.json({ message: 'Eliminado correctamente' })
})

module.exports = router
