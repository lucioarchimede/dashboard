const express = require('express')
const cors = require('cors')
const path = require('path')
const migrate = require('./db/migrate')

migrate()

const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  app.use(express.static(path.join(__dirname, '../client/dist')))
} else {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
}
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/products', require('./routes/products'))
app.use('/api/sales', require('./routes/sales'))
app.use('/api/expenses', require('./routes/expenses'))
app.use('/api/stock', require('./routes/stock'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reports', require('./routes/reports'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/cash-flow', require('./routes/cash_flow'))
app.use('/api/notes', require('./routes/notes'))
app.use('/api/marketing-metrics', require('./routes/marketing_metrics'))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
