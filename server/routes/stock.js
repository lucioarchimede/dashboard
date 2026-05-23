const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/alerts', (req, res) => {
  const db = getDb()
  const alerts = db.prepare(`
    SELECT id, name, sku, category, current_stock, min_stock,
      CASE WHEN current_stock = 0 THEN 'agotado' ELSE 'bajo' END as alert_type
    FROM products
    WHERE is_active = 1 AND current_stock <= min_stock
    ORDER BY current_stock ASC
  `).all()
  res.json(alerts)
})

router.get('/movements', (req, res) => {
  const db = getDb()
  const { product_id, from, to } = req.query
  let sql = `
    SELECT sm.*, p.name as product_name, p.sku
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `
  const params = []
  if (product_id) { sql += ' AND sm.product_id = ?'; params.push(product_id) }
  if (from) { sql += ' AND sm.movement_date >= ?'; params.push(from) }
  if (to) { sql += ' AND sm.movement_date <= ?'; params.push(to) }
  sql += ' ORDER BY sm.movement_date DESC, sm.created_at DESC LIMIT 100'
  const movements = db.prepare(sql).all(...params)
  res.json(movements)
})

router.post('/adjust', (req, res) => {
  const db = getDb()
  const { product_id, type, quantity, reason } = req.body
  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'Producto, tipo y cantidad son requeridos' })
  }
  if (!['entrada', 'salida', 'ajuste'].includes(type)) {
    return res.status(400).json({ error: 'Tipo debe ser: entrada, salida o ajuste' })
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

  const adjust = db.transaction(() => {
    const delta = type === 'salida' ? -Math.abs(quantity) : Math.abs(quantity)
    db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(delta, product_id)
    db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, reason, movement_date)
      VALUES (?, ?, ?, ?, date('now'))
    `).run(product_id, type, Math.abs(quantity), reason || 'Ajuste manual')
  })
  adjust()

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id)
  res.json({ message: 'Stock ajustado correctamente', product: updated })
})

router.get('/forecast', (req, res) => {
  const db = getDb()
  const LEAD_TIME = 7

  const products = db.prepare(`
    SELECT p.id, p.name, p.sku, p.current_stock, p.min_stock, p.cost_price, p.sale_price,
      COALESCE(SUM(CASE WHEN s.status='completada' AND s.sale_date >= date('now','-30 days') THEN s.quantity ELSE 0 END), 0) as sold_30d,
      COALESCE(SUM(CASE WHEN s.status='completada' AND s.sale_date >= date('now','-7 days') THEN s.quantity ELSE 0 END), 0) as sold_7d,
      COALESCE(SUM(CASE WHEN s.status='completada' AND s.sale_date >= date('now','-14 days') AND s.sale_date < date('now','-7 days') THEN s.quantity ELSE 0 END), 0) as sold_prev_7d
    FROM products p
    LEFT JOIN sales s ON s.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id ORDER BY p.name
  `).all()

  const today = new Date()
  const predictions = products.map(p => {
    const avgDaily = p.sold_30d / 30
    const daysRemaining = avgDaily > 0 ? Math.floor(p.current_stock / avgDaily) : 9999
    const stockoutDate = new Date(today)
    stockoutDate.setDate(today.getDate() + daysRemaining)
    const safetyStock = Math.ceil(avgDaily * 3)
    const reorderPoint = Math.ceil(avgDaily * LEAD_TIME + safetyStock)
    const suggestedOrderQty = Math.max(0, Math.ceil(avgDaily * 30) - p.current_stock)
    const trend = p.sold_prev_7d > 0
      ? parseFloat(((p.sold_7d - p.sold_prev_7d) / p.sold_prev_7d * 100).toFixed(1))
      : 0
    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      current_stock: p.current_stock,
      min_stock: p.min_stock,
      cost_price: p.cost_price,
      avg_daily_sales: parseFloat(avgDaily.toFixed(2)),
      days_remaining: Math.min(daysRemaining, 999),
      stockout_date: daysRemaining < 999 ? stockoutDate.toISOString().split('T')[0] : null,
      reorder_point: reorderPoint,
      suggested_order_qty: suggestedOrderQty,
      order_cost: Math.round(suggestedOrderQty * p.cost_price),
      lead_time: LEAD_TIME,
      trend,
      needs_reorder: p.current_stock <= reorderPoint
    }
  })

  // Sort: needs_reorder first, then by days_remaining ascending
  predictions.sort((a, b) => {
    if (a.needs_reorder !== b.needs_reorder) return a.needs_reorder ? -1 : 1
    return a.days_remaining - b.days_remaining
  })

  const needing = predictions.filter(p => p.needs_reorder)
  const suggestedInvestment = predictions.reduce((s, p) => s + p.order_cost, 0)
  const sellable = predictions.filter(p => p.avg_daily_sales > 0)
  const daysUntilNextReorder = sellable.length
    ? Math.max(0, Math.round(Math.min(...sellable.map(p => p.days_remaining - p.lead_time))))
    : null

  const recommendations = []
  const critical = predictions.filter(p => p.days_remaining <= 7 && p.avg_daily_sales > 0)
  if (critical.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `${critical.length} producto${critical.length > 1 ? 's' : ''} crítico${critical.length > 1 ? 's' : ''}`,
      description: `${critical.slice(0, 3).map(p => p.product_name).join(', ')}${critical.length > 3 ? ` y ${critical.length - 3} más` : ''} se agotan en menos de 7 días. Hacé el pedido hoy.`
    })
  }
  const trending = predictions.filter(p => p.trend > 20 && p.avg_daily_sales > 0)
  if (trending.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Ventas en aumento',
      description: `${trending.slice(0, 2).map(p => p.product_name).join(', ')} venden ${trending[0].trend.toFixed(0)}% más que la semana pasada. Considerá aumentar el pedido.`
    })
  }
  const overstock = predictions.filter(p => p.days_remaining > 60 && p.avg_daily_sales > 0)
  if (overstock.length > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Exceso de stock',
      description: `${overstock.slice(0, 3).map(p => p.product_name).join(', ')} tienen stock para más de 60 días. Considerá una promoción.`
    })
  }
  const noSales = predictions.filter(p => p.avg_daily_sales === 0 && p.current_stock > 0)
  if (noSales.length > 0) {
    recommendations.push({
      priority: 'low',
      title: 'Sin ventas en 30 días',
      description: `${noSales.slice(0, 3).map(p => p.product_name).join(', ')} no registraron ventas en los últimos 30 días.`
    })
  }

  res.json({
    summary: {
      total_products: predictions.length,
      products_needing_reorder: needing.length,
      suggested_investment: Math.round(suggestedInvestment),
      days_until_next_reorder: daysUntilNextReorder
    },
    predictions,
    recommendations
  })
})

router.get('/projection', (req, res) => {
  const db = getDb()
  const days = Math.min(parseInt(req.query.days) || 30, 60)

  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.sku, p.current_stock,
      COALESCE(SUM(CASE WHEN s.status='completada' AND s.sale_date >= date('now','-30 days') THEN s.quantity ELSE 0 END), 0) as sold_30d
    FROM products p
    LEFT JOIN sales s ON s.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id
    HAVING sold_30d > 0
    ORDER BY sold_30d DESC LIMIT 5
  `).all()

  const today = new Date()
  const projection = []
  for (let i = 0; i <= days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const point = { date: date.toISOString().split('T')[0] }
    for (const p of topProducts) {
      const avgDaily = p.sold_30d / 30
      point[p.sku || `p${p.id}`] = Math.max(0, Math.round(p.current_stock - avgDaily * i))
    }
    projection.push(point)
  }

  const productMeta = topProducts.map(p => {
    const avgDaily = p.sold_30d / 30
    return {
      key: p.sku || `p${p.id}`,
      name: p.name,
      reorder_point: Math.ceil(avgDaily * 7 + Math.ceil(avgDaily * 3))
    }
  })

  res.json({ projection, products: productMeta })
})

module.exports = router
