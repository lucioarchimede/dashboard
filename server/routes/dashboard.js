const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/kpis', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  const dateFilter = (alias) => {
    let f = ''
    if (from) f += ` AND ${alias}.sale_date >= '${from}'`
    if (to) f += ` AND ${alias}.sale_date <= '${to}'`
    return f
  }
  const expFilter = () => {
    let f = ''
    if (from) f += ` AND expense_date >= '${from}'`
    if (to) f += ` AND expense_date <= '${to}'`
    return f
  }

  // Revenue, COGS, profit from sales
  const salesKpi = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(CASE WHEN s.status = 'completada' THEN s.total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN s.status = 'completada' THEN p.cost_price * s.quantity ELSE 0 END), 0) as cogs,
      COALESCE(SUM(CASE WHEN s.status = 'completada' THEN s.shipping_cost + s.platform_fee + s.payment_fee ELSE 0 END), 0) as sale_fees,
      COALESCE(SUM(CASE WHEN s.status = 'completada' THEN s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END), 0) as gross_profit,
      COALESCE(SUM(CASE WHEN s.status = 'completada' THEN s.quantity ELSE 0 END), 0) as units_sold
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1 ${dateFilter('s')}
  `).get()

  const totalExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1 ${expFilter()}
  `).get().total

  let mktSql = `SELECT COALESCE(SUM(ad_spend), 0) as total FROM marketing_metrics WHERE 1=1`
  if (from) mktSql += ` AND date >= '${from}'`
  if (to)   mktSql += ` AND date <= '${to}'`
  const marketingSpend = db.prepare(mktSql).get().total

  const totalCosts = totalExpenses + marketingSpend
  const netProfit = salesKpi.gross_profit - totalCosts
  const margin = salesKpi.revenue > 0 ? (netProfit / salesKpi.revenue * 100) : 0

  // Previous period for comparison
  let prevFrom, prevTo
  if (from && to) {
    const diff = new Date(to) - new Date(from)
    prevTo = from
    const prevFromDate = new Date(new Date(from).getTime() - diff - 86400000)
    prevFrom = prevFromDate.toISOString().split('T')[0]
  }

  let prevRevenue = 0, prevNetProfit = 0
  if (prevFrom && prevTo) {
    const prevSales = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total - (p.cost_price*s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END), 0) as gross_profit
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= '${prevFrom}' AND s.sale_date <= '${prevTo}'
    `).get()
    const prevExp = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date >= '${prevFrom}' AND expense_date <= '${prevTo}'`).get().total
    prevRevenue = prevSales.revenue
    prevNetProfit = prevSales.gross_profit - prevExp
  }

  const revenueChange = prevRevenue > 0 ? ((salesKpi.revenue - prevRevenue) / prevRevenue * 100) : null
  const profitChange = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit) * 100) : null

  // LTV for the period
  let ltvSql = `SELECT COUNT(DISTINCT customer_email) as uniq FROM sales WHERE status='completada' AND customer_email IS NOT NULL AND customer_email != ''`
  if (from) ltvSql += ` AND sale_date >= '${from}'`
  if (to) ltvSql += ` AND sale_date <= '${to}'`
  const ltvData = db.prepare(ltvSql).get()
  const ltv = ltvData.uniq > 0 ? Math.round(salesKpi.revenue / ltvData.uniq) : null
  const cogsPercent = salesKpi.revenue > 0
    ? parseFloat((salesKpi.cogs / salesKpi.revenue * 100).toFixed(1))
    : 0

  let channelSql = `SELECT channel, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM sales WHERE status='completada'`
  if (from) channelSql += ` AND sale_date >= '${from}'`
  if (to) channelSql += ` AND sale_date <= '${to}'`
  channelSql += ' GROUP BY channel ORDER BY revenue DESC'
  const channels = db.prepare(channelSql).all()

  res.json({
    revenue: Math.round(salesKpi.revenue),
    cogs: Math.round(salesKpi.cogs),
    sale_fees: Math.round(salesKpi.sale_fees),
    total_expenses: Math.round(totalExpenses),
    marketing_spend: Math.round(marketingSpend),
    total_costs: Math.round(totalCosts),
    gross_profit: Math.round(salesKpi.gross_profit),
    net_profit: Math.round(netProfit),
    margin: parseFloat(margin.toFixed(1)),
    total_orders: salesKpi.total_orders,
    units_sold: salesKpi.units_sold,
    ltv,
    cogs_percent: cogsPercent,
    revenue_change: revenueChange !== null ? parseFloat(revenueChange.toFixed(1)) : null,
    profit_change: profitChange !== null ? parseFloat(profitChange.toFixed(1)) : null,
    channels
  })
})

router.get('/charts', (req, res) => {
  const db = getDb()
  const { from, to } = req.query

  // Revenue vs expenses over time (daily aggregated to ~30 points)
  let revSql = `
    SELECT s.sale_date as date,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total - (p.cost_price*s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END), 0) as profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1
  `
  if (from) revSql += ` AND s.sale_date >= '${from}'`
  if (to) revSql += ` AND s.sale_date <= '${to}'`
  revSql += ' GROUP BY s.sale_date ORDER BY s.sale_date ASC'
  const revenueByDay = db.prepare(revSql).all()

  // Expenses by day
  let expSql = `SELECT expense_date as date, COALESCE(SUM(amount),0) as expenses FROM expenses WHERE 1=1`
  if (from) expSql += ` AND expense_date >= '${from}'`
  if (to) expSql += ` AND expense_date <= '${to}'`
  expSql += ' GROUP BY expense_date ORDER BY expense_date ASC'
  const expByDay = db.prepare(expSql).all()

  // Merge
  const dayMap = {}
  for (const r of revenueByDay) { dayMap[r.date] = { date: r.date, revenue: r.revenue, profit: r.profit, expenses: 0 } }
  for (const e of expByDay) {
    if (dayMap[e.date]) { dayMap[e.date].expenses = e.expenses }
    else { dayMap[e.date] = { date: e.date, revenue: 0, profit: 0, expenses: e.expenses } }
  }
  const timeline = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))

  // Cost distribution (donut)
  const salesAgg = db.prepare(`
    SELECT
      COALESCE(SUM(p.cost_price * s.quantity), 0) as cogs,
      COALESCE(SUM(s.shipping_cost), 0) as shipping,
      COALESCE(SUM(s.platform_fee + s.payment_fee), 0) as commissions
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status='completada'
    ${from ? ` AND s.sale_date >= '${from}'` : ''}
    ${to ? ` AND s.sale_date <= '${to}'` : ''}
  `).get()

  let expCatSql = `SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1`
  if (from) expCatSql += ` AND expense_date >= '${from}'`
  if (to) expCatSql += ` AND expense_date <= '${to}'`
  expCatSql += ' GROUP BY category'
  const expByCategory = db.prepare(expCatSql).all()

  let mktSpendSql = `SELECT COALESCE(SUM(ad_spend), 0) as total FROM marketing_metrics WHERE 1=1`
  if (from) mktSpendSql += ` AND date >= '${from}'`
  if (to)   mktSpendSql += ` AND date <= '${to}'`
  const mktSpendChart = db.prepare(mktSpendSql).get().total

  const costDistribution = [
    { name: 'Costo Productos', value: Math.round(salesAgg.cogs) },
    { name: 'Envíos', value: Math.round(salesAgg.shipping) },
    { name: 'Comisiones', value: Math.round(salesAgg.commissions) },
    ...expByCategory.map(e => ({ name: e.category, value: Math.round(e.total) })),
    ...(mktSpendChart > 0 ? [{ name: 'Publicidad', value: Math.round(mktSpendChart) }] : [])
  ].filter(d => d.value > 0)

  // Top 5 products by profit
  let topSql = `
    SELECT p.name, p.sku,
      ROUND(SUM(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee), 0) as profit,
      SUM(s.quantity) as units_sold,
      SUM(s.total) as revenue
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status = 'completada'
    ${from ? ` AND s.sale_date >= '${from}'` : ''}
    ${to ? ` AND s.sale_date <= '${to}'` : ''}
    GROUP BY s.product_id ORDER BY profit DESC LIMIT 5
  `
  const topProducts = db.prepare(topSql).all()

  res.json({ timeline, costDistribution, topProducts })
})

router.get('/inventory', (req, res) => {
  const db = getDb()

  const products = db.prepare(`
    SELECT p.id, p.name, p.sku, p.current_stock, p.min_stock, p.cost_price,
      COALESCE(SUM(CASE WHEN s.status='completada' AND s.sale_date >= date('now','-30 days') THEN s.quantity ELSE 0 END), 0) as sold_30d
    FROM products p
    LEFT JOIN sales s ON s.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.name
  `).all()

  const inventoryValue = products.reduce((sum, p) => sum + p.cost_price * p.current_stock, 0)
  const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0)
  const totalSold30d = products.reduce((sum, p) => sum + p.sold_30d, 0)
  const avgDaily = totalSold30d / 30
  const inventoryDays = avgDaily > 0 ? Math.round(totalStock / avgDaily) : null

  const cogsLast30 = db.prepare(`
    SELECT COALESCE(SUM(p.cost_price * s.quantity), 0) as cogs
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status='completada' AND s.sale_date >= date('now','-30 days')
  `).get().cogs

  const stockTurnover = inventoryValue > 0 ? parseFloat((cogsLast30 / inventoryValue).toFixed(2)) : null

  const stockEvolution = db.prepare(`
    SELECT strftime('%Y-%m', movement_date) as month,
      SUM(CASE WHEN type='entrada' THEN quantity ELSE -quantity END) as net_change
    FROM stock_movements
    WHERE movement_date >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `).all()

  const recentSales = db.prepare(`
    SELECT s.id, COALESCE(p.name,'—') as product_name, s.quantity, s.total, s.channel, s.sale_date
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status = 'completada'
    ORDER BY s.sale_date DESC, s.id DESC LIMIT 10
  `).all()

  const stockStatus = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    current_stock: p.current_stock,
    min_stock: p.min_stock,
    days_remaining: p.sold_30d > 0 ? Math.round(p.current_stock / (p.sold_30d / 30)) : null,
    status: p.current_stock === 0 ? 'out' : p.current_stock <= p.min_stock ? 'low' : 'ok'
  })).sort((a, b) => {
    const order = { out: 0, low: 1, ok: 2 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
  }).slice(0, 10)

  res.json({
    inventory_value: Math.round(inventoryValue),
    total_stock: totalStock,
    inventory_days: inventoryDays,
    stock_turnover: stockTurnover,
    stock_evolution: stockEvolution,
    recent_sales: recentSales,
    stock_status: stockStatus
  })
})

// Dashboard section: Ventas
router.get('/ventas', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  const df = (a) => `${from ? ` AND ${a}.sale_date >= '${from}'` : ''}${to ? ` AND ${a}.sale_date <= '${to}'` : ''}`

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status='completada' THEN total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN status='completada' THEN gross_sales ELSE 0 END), 0) as gross_sales,
      COALESCE(SUM(CASE WHEN status='completada' THEN discount ELSE 0 END), 0) as discounts,
      COALESCE(SUM(CASE WHEN status='completada' THEN quantity ELSE 0 END), 0) as units,
      COUNT(CASE WHEN status='completada' THEN 1 END) as orders,
      COUNT(CASE WHEN status='cancelada' THEN 1 END) as cancelled,
      COUNT(DISTINCT customer_email) as unique_customers,
      COUNT(CASE WHEN is_repeat_customer=1 THEN 1 END) as repeat_orders,
      COALESCE(AVG(CASE WHEN status='completada' THEN total END), 0) as aov
    FROM sales WHERE 1=1 ${df('sales').replace(/s\./g, '')}
  `).get()

  const byChannel = db.prepare(`
    SELECT channel,
      COUNT(*) as orders, SUM(total) as revenue, SUM(quantity) as units
    FROM sales WHERE status='completada' ${df('sales').replace(/s\./g, '')}
    GROUP BY channel ORDER BY revenue DESC
  `).all()

  const byProduct = db.prepare(`
    SELECT p.name, s.product_id,
      SUM(s.quantity) as units, SUM(s.total) as revenue, COUNT(*) as orders
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status='completada' ${df('s')}
    GROUP BY s.product_id ORDER BY revenue DESC LIMIT 10
  `).all()

  const daily = db.prepare(`
    SELECT sale_date as date, SUM(total) as revenue, SUM(quantity) as units, COUNT(*) as orders
    FROM sales WHERE status='completada' ${df('sales').replace(/s\./g, '')}
    GROUP BY sale_date ORDER BY sale_date ASC
  `).all()

  res.json({ totals, byChannel, byProduct, daily })
})

// Dashboard section: Rentabilidad
router.get('/rentabilidad', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  const df = (a) => `${from ? ` AND ${a}.sale_date >= '${from}'` : ''}${to ? ` AND ${a}.sale_date <= '${to}'` : ''}`
  const ef = () => `${from ? ` AND expense_date >= '${from}'` : ''}${to ? ` AND expense_date <= '${to}'` : ''}`

  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(s.total), 0) as revenue,
      COALESCE(SUM(p.cost_price * s.quantity), 0) as cogs,
      COALESCE(SUM(s.shipping_cost), 0) as shipping,
      COALESCE(SUM(s.platform_fee), 0) as platform_fees,
      COALESCE(SUM(s.payment_fee), 0) as payment_fees,
      COALESCE(SUM(s.discount), 0) as discounts,
      COALESCE(SUM(s.mp_commission), 0) as mp_commissions,
      COALESCE(SUM(s.tax_amount), 0) as taxes,
      COALESCE(SUM(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee), 0) as gross_profit
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status='completada' ${df('s')}
  `).get()

  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1 ${ef()}`).get().total

  const revenue = sales.revenue
  const netProfit = sales.gross_profit - totalExpenses
  const grossMargin = revenue > 0 ? sales.gross_profit / revenue * 100 : 0
  const netMargin = revenue > 0 ? netProfit / revenue * 100 : 0
  const cogsPercent = revenue > 0 ? sales.cogs / revenue * 100 : 0

  const byProduct = db.prepare(`
    SELECT p.name, p.sku, p.cost_price, p.sale_price,
      SUM(s.quantity) as units,
      SUM(s.total) as revenue,
      SUM(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee) as profit,
      CASE WHEN SUM(s.total) > 0
        THEN ROUND(SUM(s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee) / SUM(s.total) * 100, 1)
        ELSE 0 END as margin_pct
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.status='completada' ${df('s')}
    GROUP BY s.product_id ORDER BY profit DESC
  `).all()

  res.json({
    revenue: Math.round(revenue),
    cogs: Math.round(sales.cogs),
    shipping: Math.round(sales.shipping),
    platform_fees: Math.round(sales.platform_fees),
    payment_fees: Math.round(sales.payment_fees),
    mp_commissions: Math.round(sales.mp_commissions),
    taxes: Math.round(sales.taxes),
    discounts: Math.round(sales.discounts),
    gross_profit: Math.round(sales.gross_profit),
    total_expenses: Math.round(totalExpenses),
    net_profit: Math.round(netProfit),
    gross_margin: parseFloat(grossMargin.toFixed(1)),
    net_margin: parseFloat(netMargin.toFixed(1)),
    cogs_percent: parseFloat(cogsPercent.toFixed(1)),
    byProduct,
  })
})

// Dashboard section: Marketing
router.get('/marketing', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  let where = 'WHERE 1=1'
  if (from) where += ` AND date >= '${from}'`
  if (to)   where += ` AND date <= '${to}'`

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(ad_spend), 0) as total_spend,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(conversions), 0) as conversions,
      COALESCE(SUM(revenue_attributed), 0) as revenue_attributed,
      COALESCE(SUM(leads), 0) as leads,
      COALESCE(SUM(emails_captured), 0) as emails_captured
    FROM marketing_metrics ${where}
  `).get()

  const roas = summary.total_spend > 0 ? parseFloat((summary.revenue_attributed / summary.total_spend).toFixed(2)) : null
  const ctr  = summary.impressions > 0 ? parseFloat((summary.clicks / summary.impressions * 100).toFixed(2)) : null
  const cpc  = summary.clicks > 0 ? parseFloat((summary.total_spend / summary.clicks).toFixed(2)) : null
  const cpa  = summary.conversions > 0 ? parseFloat((summary.total_spend / summary.conversions).toFixed(2)) : null
  const cpl  = summary.leads > 0 ? parseFloat((summary.total_spend / summary.leads).toFixed(2)) : null

  const byPlatform = db.prepare(`
    SELECT platform,
      SUM(ad_spend) as spend, SUM(impressions) as impressions,
      SUM(clicks) as clicks, SUM(conversions) as conversions,
      SUM(revenue_attributed) as revenue
    FROM marketing_metrics ${where}
    GROUP BY platform ORDER BY spend DESC
  `).all()

  const daily = db.prepare(`
    SELECT date, SUM(ad_spend) as spend, SUM(clicks) as clicks,
      SUM(conversions) as conversions, SUM(revenue_attributed) as revenue
    FROM marketing_metrics ${where}
    GROUP BY date ORDER BY date ASC
  `).all()

  res.json({ summary: { ...summary, roas, ctr, cpc, cpa, cpl }, byPlatform, daily })
})

// Dashboard section: Producto (product performance + feedback)
router.get('/producto', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  const df = (a) => `${from ? ` AND ${a}.sale_date >= '${from}'` : ''}${to ? ` AND ${a}.sale_date <= '${to}'` : ''}`

  const products = db.prepare(`
    SELECT
      p.id, p.name, p.sku, p.aroma, p.variant,
      p.cost_price, p.sale_price, p.current_stock, p.min_stock,
      p.import_cost_per_unit, p.packaging_cost, p.lot_number, p.expiry_date,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.quantity ELSE 0 END), 0) as units_sold,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN s.status='completada' THEN s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END), 0) as profit,
      CASE WHEN SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END) > 0
        THEN ROUND(SUM(CASE WHEN s.status='completada' THEN s.total - (p.cost_price * s.quantity) - s.shipping_cost - s.platform_fee - s.payment_fee ELSE 0 END)
          / SUM(CASE WHEN s.status='completada' THEN s.total ELSE 0 END) * 100, 1)
        ELSE 0 END as margin_pct,
      CASE WHEN p.cost_price > 0 THEN ROUND((p.sale_price - p.cost_price) / p.cost_price * 100, 1) ELSE 0 END as roi_pct
    FROM products p
    LEFT JOIN sales s ON s.product_id = p.id ${df('s').replace(/s\./g, 's.')}
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY revenue DESC
  `).all()

  res.json({ products })
})

// Dashboard section: Cashflow summary
router.get('/cashflow', (req, res) => {
  const db = getDb()
  const { from, to } = req.query
  let where = 'WHERE 1=1'
  if (from) where += ` AND date >= '${from}'`
  if (to)   where += ` AND date <= '${to}'`

  const summary = db.prepare(`
    SELECT
      SUM(CASE WHEN type='ingreso' THEN amount ELSE 0 END) as ingresos,
      SUM(CASE WHEN type='egreso' THEN amount ELSE 0 END) as egresos,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END) as balance
    FROM cash_flow ${where}
  `).get()

  const byAccount = db.prepare(`
    SELECT account,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE 0 END) as ingresos,
      SUM(CASE WHEN type='egreso' THEN amount ELSE 0 END) as egresos,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END) as balance
    FROM cash_flow ${where}
    GROUP BY account
  `).all()

  const byCategory = db.prepare(`
    SELECT category, type, SUM(amount) as total
    FROM cash_flow ${where}
    GROUP BY category, type ORDER BY total DESC
  `).all()

  const daily = db.prepare(`
    SELECT date,
      SUM(CASE WHEN type='ingreso' THEN amount ELSE 0 END) as ingresos,
      SUM(CASE WHEN type='egreso' THEN amount ELSE 0 END) as egresos
    FROM cash_flow ${where}
    GROUP BY date ORDER BY date ASC
  `).all()

  res.json({
    summary: {
      ingresos: Math.round(summary.ingresos || 0),
      egresos: Math.round(summary.egresos || 0),
      balance: Math.round(summary.balance || 0),
    },
    byAccount,
    byCategory,
    daily,
  })
})

module.exports = router
