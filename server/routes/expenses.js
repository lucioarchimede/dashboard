const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const { from, to, category } = req.query
  let sql = 'SELECT * FROM expenses WHERE 1=1'
  const params = []
  if (from) { sql += ' AND expense_date >= ?'; params.push(from) }
  if (to) { sql += ' AND expense_date <= ?'; params.push(to) }
  if (category) { sql += ' AND category = ?'; params.push(category) }
  sql += ' ORDER BY expense_date DESC'
  const expenses = db.prepare(sql).all(...params)
  res.json(expenses)
})

router.get('/export/csv', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  let sql = 'SELECT expense_date, category, subcategory, description, amount, is_recurring, recurrence_period FROM expenses WHERE 1=1'
  const params = []
  if (from) { sql += ' AND expense_date >= ?'; params.push(from) }
  if (to) { sql += ' AND expense_date <= ?'; params.push(to) }
  sql += ' ORDER BY expense_date DESC'
  const rows = db.prepare(sql).all(...params)
  const headers = 'Fecha,Categoría,Subcategoría,Descripción,Monto,Recurrente,Período'
  const csvRows = rows.map(r => `"${r.expense_date}","${r.category}","${r.subcategory || ''}","${r.description}","${r.amount}","${r.is_recurring ? 'Sí' : 'No'}","${r.recurrence_period || ''}"`)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="gastos.csv"')
  res.send('﻿' + [headers, ...csvRows].join('\n'))
})

router.post('/', (req, res) => {
  const db = getDb()
  const { category, subcategory, description, amount, is_recurring = false, recurrence_period, expense_date } = req.body
  if (!category || !description || !amount || !expense_date) {
    return res.status(400).json({ error: 'Categoría, descripción, monto y fecha son requeridos' })
  }
  const result = db.prepare(`
    INSERT INTO expenses (category, subcategory, description, amount, is_recurring, recurrence_period, expense_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(category, subcategory || null, description, amount, is_recurring ? 1 : 0, recurrence_period || null, expense_date)
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' })
  const { category, subcategory, description, amount, is_recurring, recurrence_period, expense_date } = req.body
  db.prepare(`
    UPDATE expenses SET category=?, subcategory=?, description=?, amount=?, is_recurring=?, recurrence_period=?, expense_date=?
    WHERE id=?
  `).run(
    category ?? existing.category, subcategory ?? existing.subcategory, description ?? existing.description,
    amount ?? existing.amount, is_recurring !== undefined ? (is_recurring ? 1 : 0) : existing.is_recurring,
    recurrence_period ?? existing.recurrence_period, expense_date ?? existing.expense_date, req.params.id
  )
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' })
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.json({ message: 'Gasto eliminado correctamente' })
})

module.exports = router
