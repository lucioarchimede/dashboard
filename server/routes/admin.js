const express = require('express')
const router = express.Router()
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.post('/reset-data', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' })
  }

  const db = getDb()
  const tables = [
    'stock_movements',
    'sales',
    'expenses',
    'products',
    'marketing_metrics',
    'cash_flow',
    'business_notes',
    'product_feedback',
    'goals',
  ]

  try {
    for (const table of tables) {
      try { db.exec(`DELETE FROM ${table}`) } catch (_) {}
    }
    try {
      const names = tables.map(t => `'${t}'`).join(',')
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${names})`)
    } catch (_) {}

    res.json({ message: 'Datos eliminados correctamente' })
  } catch (err) {
    console.error('Error al resetear datos:', err)
    res.status(500).json({ error: 'Error al eliminar datos' })
  }
})

module.exports = router
