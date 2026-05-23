const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const { from, to, channel, status, product_id, page = 1, limit = 50 } = req.query
  let sql = `
    SELECT s.*, p.name as product_name, p.sku, p.cost_price,
      ROUND(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee, 2) as profit
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1
  `
  const params = []
  if (from) { sql += ' AND s.sale_date >= ?'; params.push(from) }
  if (to) { sql += ' AND s.sale_date <= ?'; params.push(to) }
  if (channel) { sql += ' AND s.channel = ?'; params.push(channel) }
  if (status) { sql += ' AND s.status = ?'; params.push(status) }
  if (product_id) { sql += ' AND s.product_id = ?'; params.push(product_id) }
  sql += ' ORDER BY s.sale_date DESC, s.created_at DESC'
  sql += ` LIMIT ? OFFSET ?`
  params.push(Number(limit), (Number(page) - 1) * Number(limit))

  const sales = db.prepare(sql).all(...params)

  const countSql = `SELECT COUNT(*) as total FROM sales s WHERE 1=1` +
    (from ? ` AND s.sale_date >= '${from}'` : '') +
    (to ? ` AND s.sale_date <= '${to}'` : '') +
    (channel ? ` AND s.channel = '${channel}'` : '') +
    (status ? ` AND s.status = '${status}'` : '')

  const { total } = db.prepare(countSql).get()
  res.json({ data: sales, total, page: Number(page), limit: Number(limit) })
})

router.get('/export/csv', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  let sql = `
    SELECT s.sale_date, p.name as producto, p.sku, s.quantity as cantidad, s.unit_price as precio_unitario,
      s.total, p.cost_price as costo_unitario, s.shipping_cost as envio, s.platform_fee as comision_plataforma,
      s.payment_fee as comision_pago, s.channel as canal, s.customer_name as cliente, s.status as estado,
      ROUND(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee, 2) as profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id WHERE 1=1
  `
  const params = []
  if (from) { sql += ' AND s.sale_date >= ?'; params.push(from) }
  if (to) { sql += ' AND s.sale_date <= ?'; params.push(to) }
  sql += ' ORDER BY s.sale_date DESC'
  const rows = db.prepare(sql).all(...params)

  const headers = Object.keys(rows[0] || {}).join(',')
  const csvRows = rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))
  const csv = [headers, ...csvRows].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="ventas.csv"')
  res.send('﻿' + csv)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const sale = db.prepare(`
    SELECT s.*, p.name as product_name, p.sku, p.cost_price,
      ROUND(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee, 2) as profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.id = ?
  `).get(req.params.id)
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })
  res.json(sale)
})

router.post('/', (req, res) => {
  const db = getDb()
  const {
    product_id, quantity, unit_price, shipping_cost = 0, platform_fee = 0, payment_fee = 0,
    channel = 'shopify', customer_name, customer_email, customer_phone, payment_method,
    status = 'completada', notes, sale_date, discount = 0, mp_commission_percent = 0, tax_amount = 0
  } = req.body

  if (!product_id || !quantity || !unit_price || !sale_date) {
    return res.status(400).json({ error: 'Producto, cantidad, precio y fecha son requeridos' })
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

  const gross_sales = quantity * unit_price
  const net_sales = gross_sales - discount
  const total = net_sales
  const mp_commission = channel === 'mercadolibre' && mp_commission_percent > 0
    ? net_sales * (mp_commission_percent / 100)
    : payment_fee

  const insertSale = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO sales (product_id, quantity, unit_price, total, shipping_cost, platform_fee, payment_fee,
        channel, customer_name, customer_email, customer_phone, payment_method, status, notes, sale_date,
        gross_sales, discount, net_sales, mp_commission, mp_commission_percent, tax_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id, quantity, unit_price, total, shipping_cost, platform_fee, mp_commission,
      channel, customer_name || null, customer_email || null, customer_phone || null,
      payment_method || null, status, notes || null, sale_date,
      gross_sales, discount, net_sales, mp_commission, mp_commission_percent, tax_amount
    )

    if (status === 'completada') {
      db.prepare('UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id)
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, movement_date)
        VALUES (?, 'salida', ?, 'Venta registrada', ?, ?)
      `).run(product_id, quantity, result.lastInsertRowid, sale_date)
    }
    return result.lastInsertRowid
  })

  const saleId = insertSale()
  const sale = db.prepare(`
    SELECT s.*, p.name as product_name, p.cost_price,
      ROUND(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee, 2) as profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id WHERE s.id = ?
  `).get(saleId)
  res.status(201).json(sale)
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Venta no encontrada' })

  const {
    product_id, quantity, unit_price, discount, shipping_cost, platform_fee, payment_fee,
    mp_commission_percent, channel, customer_name, customer_email, customer_phone,
    payment_method, status, notes, sale_date, tax_amount
  } = req.body

  const qty = quantity ?? existing.quantity
  const price = unit_price ?? existing.unit_price
  const disc = discount ?? existing.discount ?? 0
  const gross_sales = qty * price
  const net_sales = gross_sales - disc
  const total = net_sales
  const mpPct = mp_commission_percent ?? existing.mp_commission_percent ?? 0
  const ch = channel ?? existing.channel
  const mp_commission = ch === 'mercadolibre' && mpPct > 0
    ? net_sales * (mpPct / 100)
    : (payment_fee ?? existing.payment_fee)

  db.prepare(`
    UPDATE sales SET product_id=?, quantity=?, unit_price=?, total=?, shipping_cost=?, platform_fee=?, payment_fee=?,
    channel=?, customer_name=?, customer_email=?, customer_phone=?, payment_method=?, status=?, notes=?, sale_date=?,
    gross_sales=?, discount=?, net_sales=?, mp_commission=?, mp_commission_percent=?, tax_amount=?
    WHERE id=?
  `).run(
    product_id ?? existing.product_id, qty, price, total,
    shipping_cost ?? existing.shipping_cost, platform_fee ?? existing.platform_fee, mp_commission,
    ch, customer_name ?? existing.customer_name, customer_email ?? existing.customer_email,
    customer_phone ?? existing.customer_phone, payment_method ?? existing.payment_method,
    status ?? existing.status, notes ?? existing.notes, sale_date ?? existing.sale_date,
    gross_sales, disc, net_sales, mp_commission, mpPct, tax_amount ?? existing.tax_amount ?? 0,
    req.params.id
  )
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id)
  res.json(sale)
})

router.patch('/:id/cancel', (req, res) => {
  const db = getDb()
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id)
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })
  if (sale.status === 'cancelada') return res.status(400).json({ error: 'La venta ya está cancelada' })

  const cancel = db.transaction(() => {
    db.prepare("UPDATE sales SET status = 'cancelada' WHERE id = ?").run(req.params.id)
    if (sale.status === 'completada') {
      db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sale.quantity, sale.product_id)
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, movement_date)
        VALUES (?, 'entrada', ?, 'Devolución por cancelación', ?, date('now'))
      `).run(sale.product_id, sale.quantity, sale.id)
    }
  })
  cancel()
  res.json({ message: 'Venta cancelada correctamente' })
})

module.exports = router
