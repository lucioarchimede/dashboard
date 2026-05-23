const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

// GET /api/clients — customer analytics derived from sales
router.get('/', (req, res) => {
  const db = getDb()
  const { from, to, search, page = 1, limit = 50 } = req.query

  let where = "WHERE s.status = 'completada' AND s.customer_email IS NOT NULL AND s.customer_email != ''"
  const params = []
  if (from) { where += ' AND s.sale_date >= ?'; params.push(from) }
  if (to)   { where += ' AND s.sale_date <= ?'; params.push(to) }

  const allCustomers = db.prepare(`
    SELECT
      s.customer_email as email,
      MAX(s.customer_name) as name,
      MAX(s.customer_phone) as phone,
      COUNT(*) as total_orders,
      SUM(s.total) as total_spent,
      AVG(s.total) as avg_order_value,
      MIN(s.sale_date) as first_purchase,
      MAX(s.sale_date) as last_purchase,
      COUNT(DISTINCT s.sale_date) as purchase_days
    FROM sales s
    ${where}
    GROUP BY s.customer_email
    ORDER BY total_spent DESC
  `).all(...params)

  const searched = search
    ? allCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : allCustomers

  const total = searched.length
  const offset = (Number(page) - 1) * Number(limit)
  const data = searched.slice(offset, offset + Number(limit)).map(c => ({
    ...c,
    is_repeat: c.total_orders > 1,
    ltv: c.total_spent,
  }))

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT s.customer_email) as total_customers,
      COUNT(DISTINCT CASE WHEN sub.cnt > 1 THEN s.customer_email END) as repeat_customers,
      AVG(s.total) as avg_order_value,
      SUM(s.total) * 1.0 / COUNT(DISTINCT s.customer_email) as avg_ltv
    FROM sales s
    LEFT JOIN (
      SELECT customer_email, COUNT(*) as cnt FROM sales
      WHERE status = 'completada' AND customer_email IS NOT NULL
      GROUP BY customer_email
    ) sub ON sub.customer_email = s.customer_email
    ${where}
  `).get(...params)

  res.json({ data, total, page: Number(page), limit: Number(limit), stats })
})

// GET /api/clients/:email — single customer detail
router.get('/:email', (req, res) => {
  const db = getDb()
  const email = decodeURIComponent(req.params.email)

  const profile = db.prepare(`
    SELECT
      s.customer_email as email,
      MAX(s.customer_name) as name,
      MAX(s.customer_phone) as phone,
      COUNT(*) as total_orders,
      SUM(s.total) as total_spent,
      AVG(s.total) as avg_order_value,
      MIN(s.sale_date) as first_purchase,
      MAX(s.sale_date) as last_purchase
    FROM sales s
    WHERE s.customer_email = ? AND s.status = 'completada'
  `).get(email)

  if (!profile || !profile.email) return res.status(404).json({ error: 'Cliente no encontrado' })

  const orders = db.prepare(`
    SELECT s.*, p.name as product_name
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.customer_email = ? AND s.status = 'completada'
    ORDER BY s.sale_date DESC
    LIMIT 20
  `).all(email)

  res.json({ ...profile, orders })
})

module.exports = router
