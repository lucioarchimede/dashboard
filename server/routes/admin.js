const express = require('express')
const router = express.Router()
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.post('/reset-data', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' })
  }

  const db = getDb()
  try {
    db.exec(`
      DELETE FROM stock_movements;
      DELETE FROM marketing_campaigns;
      DELETE FROM expenses;
      DELETE FROM sales;
      DELETE FROM products;
    `)
    try {
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN
        ('products','sales','expenses','marketing_campaigns','stock_movements')`)
    } catch (_) {}

    res.json({ message: 'Datos eliminados correctamente' })
  } catch (err) {
    console.error('Error al resetear datos:', err)
    res.status(500).json({ error: 'Error al eliminar datos' })
  }
})

module.exports = router
