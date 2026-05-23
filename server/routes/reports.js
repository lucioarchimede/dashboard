const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/pnl', (req, res) => {
  const db = getDb()
  const { month, year } = req.query
  const m = month ? String(month).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0')
  const y = year || new Date().getFullYear()
  const from = `${y}-${m}-01`
  const to = `${y}-${m}-31`

  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status='completada' THEN total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN status='completada' THEN total ELSE 0 END * 0), 0) as placeholder,
      COUNT(CASE WHEN status='completada' THEN 1 END) as orders
    FROM sales WHERE sale_date >= ? AND sale_date <= ?
  `).get(from, to)

  const detailed = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN p.cost_price * s.quantity ELSE 0 END), 0) as cogs,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.shipping_cost ELSE 0 END), 0) as shipping_cost,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.platform_fee ELSE 0 END), 0) as platform_fees,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.payment_fee ELSE 0 END), 0) as payment_fees,
      COUNT(CASE WHEN s.status='completada' THEN 1 END) as orders
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.sale_date >= ? AND s.sale_date <= ?
  `).get(from, to)

  const expByCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) as total
    FROM expenses WHERE expense_date >= ? AND expense_date <= ?
    GROUP BY category ORDER BY total DESC
  `).all(from, to)

  const totalExpenses = expByCategory.reduce((s, e) => s + e.total, 0)

  const marketingSpend = db.prepare(`
    SELECT COALESCE(SUM(ad_spend), 0) as total FROM marketing_metrics
    WHERE date >= ? AND date <= ?
  `).get(from, to).total

  const grossProfit = detailed.revenue - detailed.cogs - detailed.shipping_cost - detailed.platform_fees - detailed.payment_fees
  const netProfit = grossProfit - totalExpenses - marketingSpend
  const totalCosts = totalExpenses + marketingSpend

  const beRow = db.prepare(`
    SELECT AVG(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee) as avg_contribution
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status = 'completada' AND s.sale_date >= ? AND s.sale_date <= ?
  `).get(from, to)
  const avgContribution = Math.round(beRow.avg_contribution || 0)
  const breakEvenUnits = avgContribution > 0 ? Math.ceil(totalCosts / avgContribution) : null
  const breakEvenRevenue = breakEvenUnits && detailed.orders > 0
    ? Math.round(breakEvenUnits * (detailed.revenue / detailed.orders))
    : null

  res.json({
    period: { month: m, year: y, from, to },
    revenue: Math.round(detailed.revenue),
    cogs: Math.round(detailed.cogs),
    gross_profit: Math.round(grossProfit),
    gross_margin: detailed.revenue > 0 ? parseFloat((grossProfit / detailed.revenue * 100).toFixed(1)) : 0,
    expenses_breakdown: expByCategory.map(e => ({ ...e, total: Math.round(e.total) })),
    total_expenses: Math.round(totalExpenses),
    marketing_spend: Math.round(marketingSpend),
    total_costs: Math.round(totalCosts),
    net_profit: Math.round(netProfit),
    net_margin: detailed.revenue > 0 ? parseFloat((netProfit / detailed.revenue * 100).toFixed(1)) : 0,
    orders: detailed.orders,
    avg_order_value: detailed.orders > 0 ? Math.round(detailed.revenue / detailed.orders) : 0,
    sale_fees: Math.round(detailed.shipping_cost + detailed.platform_fees + detailed.payment_fees),
    avg_contribution_per_sale: avgContribution,
    break_even_units: breakEvenUnits,
    break_even_revenue: breakEvenRevenue
  })
})

router.get('/monthly', (req, res) => {
  const db = getDb()
  const months = parseInt(req.query.months) || 6
  const results = []

  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const y = d.getFullYear()
    const from = `${y}-${m}-01`
    const to = `${y}-${m}-31`

    const sales = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN s.status='completada' THEN p.cost_price * s.quantity ELSE 0 END), 0) as cogs,
        COALESCE(SUM(CASE WHEN s.status='completada' THEN s.shipping_cost + s.platform_fee + s.payment_fee ELSE 0 END), 0) as fees,
        COUNT(CASE WHEN s.status='completada' THEN 1 END) as orders
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= ? AND s.sale_date <= ?
    `).get(from, to)

    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?`).get(from, to).total

    const grossProfit = sales.revenue - sales.cogs - sales.fees
    const netProfit = grossProfit - expenses

    results.push({
      month: m, year: y,
      label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
      revenue: Math.round(sales.revenue),
      expenses: Math.round(expenses + sales.cogs + sales.fees),
      gross_profit: Math.round(grossProfit),
      net_profit: Math.round(netProfit),
      orders: sales.orders,
      margin: sales.revenue > 0 ? parseFloat((netProfit / sales.revenue * 100).toFixed(1)) : 0
    })
  }

  // Add change % vs previous month
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1]
    const curr = results[i]
    curr.revenue_change = prev.revenue > 0 ? parseFloat(((curr.revenue - prev.revenue) / prev.revenue * 100).toFixed(1)) : null
    curr.profit_change = prev.net_profit !== 0 ? parseFloat(((curr.net_profit - prev.net_profit) / Math.abs(prev.net_profit) * 100).toFixed(1)) : null
  }

  res.json(results)
})

router.get('/by-channel', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  let sql = `
    SELECT s.channel,
      COUNT(CASE WHEN s.status='completada' THEN 1 END) as orders,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN p.cost_price * s.quantity ELSE 0 END), 0) as cogs,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.shipping_cost + s.platform_fee + s.payment_fee ELSE 0 END), 0) as fees,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END), 0) as profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1
  `
  if (from) sql += ` AND s.sale_date >= '${from}'`
  if (to) sql += ` AND s.sale_date <= '${to}'`
  sql += ' GROUP BY s.channel ORDER BY revenue DESC'
  const data = db.prepare(sql).all()
  const totalRev = data.reduce((s, d) => s + d.revenue, 0)
  const result = data.map(d => ({
    ...d,
    revenue: Math.round(d.revenue),
    cogs: Math.round(d.cogs),
    fees: Math.round(d.fees),
    profit: Math.round(d.profit),
    margin: d.revenue > 0 ? parseFloat((d.profit / d.revenue * 100).toFixed(1)) : 0,
    share: totalRev > 0 ? parseFloat((d.revenue / totalRev * 100).toFixed(1)) : 0
  }))
  res.json(result)
})

module.exports = router
