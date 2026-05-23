const express = require('express')
const { getDb } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const { from, to, platform } = req.query
  let where = 'WHERE 1=1'
  const params = []
  if (from)     { where += ' AND date >= ?'; params.push(from) }
  if (to)       { where += ' AND date <= ?'; params.push(to) }
  if (platform) { where += ' AND platform = ?'; params.push(platform) }

  const data = db.prepare(`SELECT * FROM marketing_metrics ${where} ORDER BY date DESC`).all(...params)

  const summary = db.prepare(`
    SELECT
      SUM(ad_spend) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue_attributed) as total_revenue,
      SUM(leads) as total_leads,
      CASE WHEN SUM(ad_spend) > 0 THEN ROUND(SUM(revenue_attributed) / SUM(ad_spend), 2) END as roas,
      CASE WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks) * 100.0 / SUM(impressions), 2) END as ctr,
      CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(ad_spend) / SUM(clicks), 2) END as cpc,
      CASE WHEN SUM(conversions) > 0 THEN ROUND(SUM(ad_spend) / SUM(conversions), 2) END as cpa
    FROM marketing_metrics ${where}
  `).get(...params)

  res.json({ data, summary })
})

router.post('/', (req, res) => {
  const db = getDb()
  const {
    date, ad_spend, impressions = 0, clicks = 0, conversions = 0,
    revenue_attributed = 0, leads = 0, quiz_completed = 0, emails_captured = 0,
    platform = 'meta', campaign_name, notes
  } = req.body
  if (!date || ad_spend === undefined) {
    return res.status(400).json({ error: 'Fecha e inversión publicitaria son requeridos' })
  }
  const result = db.prepare(`
    INSERT INTO marketing_metrics
      (date, ad_spend, impressions, clicks, conversions, revenue_attributed, leads,
       quiz_completed, emails_captured, platform, campaign_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, ad_spend, impressions, clicks, conversions, revenue_attributed, leads,
         quiz_completed, emails_captured, platform, campaign_name || null, notes || null)
  res.status(201).json(db.prepare('SELECT * FROM marketing_metrics WHERE id = ?').get(result.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM marketing_metrics WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' })
  const {
    date, ad_spend, impressions, clicks, conversions, revenue_attributed,
    leads, quiz_completed, emails_captured, platform, campaign_name, notes
  } = req.body
  db.prepare(`
    UPDATE marketing_metrics
    SET date=?, ad_spend=?, impressions=?, clicks=?, conversions=?, revenue_attributed=?,
        leads=?, quiz_completed=?, emails_captured=?, platform=?, campaign_name=?, notes=?
    WHERE id=?
  `).run(
    date ?? existing.date, ad_spend ?? existing.ad_spend,
    impressions ?? existing.impressions, clicks ?? existing.clicks,
    conversions ?? existing.conversions, revenue_attributed ?? existing.revenue_attributed,
    leads ?? existing.leads, quiz_completed ?? existing.quiz_completed,
    emails_captured ?? existing.emails_captured, platform ?? existing.platform,
    campaign_name ?? existing.campaign_name, notes ?? existing.notes,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM marketing_metrics WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM marketing_metrics WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Registro no encontrado' })
  }
  db.prepare('DELETE FROM marketing_metrics WHERE id = ?').run(req.params.id)
  res.json({ message: 'Eliminado correctamente' })
})

module.exports = router
