const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const migrate = require('./db/migrate')

// Inicializar DB
try {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'db/ecomdash.db')
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    console.log('⚠️  Database not found, running setup...')
    require('./db/setup')
  } else {
    console.log('✅ Database found, running migrations...')
    migrate()
  }
} catch (err) {
  console.error('❌ DB init error:', err.message)
}

const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

// Configuración CORS
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://dashboard-six-sepia-23.vercel.app'
  ],
  credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', ts: new Date().toISOString() })
})

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
