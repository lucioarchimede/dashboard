const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const { category, active, search } = req.query
  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = []
  if (category) { sql += ' AND category = ?'; params.push(category) }
  if (active !== undefined) { sql += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0) }
  if (search) { sql += ' AND (name LIKE ? OR sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY name ASC'
  const products = db.prepare(sql).all(...params)
  // Add margin
  const enriched = products.map(p => ({
    ...p,
    margin: p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price * 100).toFixed(1) : 0,
    stock_status: p.current_stock <= 0 ? 'agotado' : p.current_stock <= p.min_stock ? 'bajo' : 'ok'
  }))
  res.json(enriched)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  const movements = db.prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY movement_date DESC LIMIT 20').all(product.id)
  res.json({
    ...product,
    margin: ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1),
    stock_status: product.current_stock <= 0 ? 'agotado' : product.current_stock <= product.min_stock ? 'bajo' : 'ok',
    movements
  })
})

router.post('/', (req, res) => {
  const db = getDb()
  const {
    name, sku, category, cost_price, sale_price, current_stock, min_stock, supplier,
    aroma, variant, import_cost_per_unit, packaging_cost, lot_number, expiry_date
  } = req.body
  if (!name || cost_price === undefined || sale_price === undefined) {
    return res.status(400).json({ error: 'Nombre, precio de costo y precio de venta son requeridos' })
  }
  try {
    const result = db.prepare(`
      INSERT INTO products (name, sku, category, cost_price, sale_price, current_stock, min_stock, supplier,
        aroma, variant, import_cost_per_unit, packaging_cost, lot_number, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, sku || null, category || null, cost_price, sale_price, current_stock || 0, min_stock || 5, supplier || null,
      aroma || 'Original', variant || 'single', import_cost_per_unit || 0, packaging_cost || 0,
      lot_number || null, expiry_date || null
    )

    if ((current_stock || 0) > 0) {
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reason, movement_date)
        VALUES (?, 'entrada', ?, 'Stock inicial', date('now'))
      `).run(result.lastInsertRowid, current_stock)
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(product)
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'El SKU ya existe' })
    throw err
  }
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const {
    name, sku, category, cost_price, sale_price, current_stock, min_stock, supplier, is_active,
    aroma, variant, import_cost_per_unit, packaging_cost, lot_number, expiry_date
  } = req.body
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  try {
    db.prepare(`
      UPDATE products SET name=?, sku=?, category=?, cost_price=?, sale_price=?, current_stock=?, min_stock=?, supplier=?,
        is_active=?, aroma=?, variant=?, import_cost_per_unit=?, packaging_cost=?, lot_number=?, expiry_date=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      name ?? existing.name, sku ?? existing.sku, category ?? existing.category,
      cost_price ?? existing.cost_price, sale_price ?? existing.sale_price,
      current_stock ?? existing.current_stock, min_stock ?? existing.min_stock,
      supplier ?? existing.supplier, is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      aroma ?? existing.aroma, variant ?? existing.variant,
      import_cost_per_unit ?? existing.import_cost_per_unit, packaging_cost ?? existing.packaging_cost,
      lot_number ?? existing.lot_number, expiry_date ?? existing.expiry_date,
      req.params.id
    )
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'El SKU ya existe' })
    throw err
  }
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id)
  res.json({ message: 'Producto desactivado correctamente' })
})

module.exports = router
