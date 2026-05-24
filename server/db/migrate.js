const { getDb } = require('./index')

// Each ALTER is run individually — failure (column already exists) is silently ignored
const COLUMN_MIGRATIONS = [
  // Products — extended model
  "ALTER TABLE products ADD COLUMN aroma TEXT DEFAULT 'Original'",
  "ALTER TABLE products ADD COLUMN variant TEXT DEFAULT 'single'",
  "ALTER TABLE products ADD COLUMN import_cost_per_unit REAL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN packaging_cost REAL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN lot_number TEXT",
  "ALTER TABLE products ADD COLUMN expiry_date DATE",
  "ALTER TABLE products ADD COLUMN units_damaged INTEGER DEFAULT 0",
  "ALTER TABLE products ADD COLUMN units_returned INTEGER DEFAULT 0",
  "ALTER TABLE products ADD COLUMN supplier_lead_time_days INTEGER DEFAULT 7",
  // Sales — detailed cost tracking
  "ALTER TABLE sales ADD COLUMN gross_sales REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN net_sales REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN mp_commission REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN mp_commission_percent REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN customer_phone TEXT",
  "ALTER TABLE sales ADD COLUMN is_repeat_customer INTEGER DEFAULT 0",
]

// Each CREATE TABLE is run individually so one error doesn't block the rest
const NEW_TABLES = [
  `CREATE TABLE IF NOT EXISTS marketing_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    ad_spend REAL NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue_attributed REAL DEFAULT 0,
    leads INTEGER DEFAULT 0,
    quiz_completed INTEGER DEFAULT 0,
    emails_captured INTEGER DEFAULT 0,
    platform TEXT NOT NULL DEFAULT 'meta',
    campaign_name TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS product_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    product_id INTEGER REFERENCES products(id),
    customer_email TEXT,
    type TEXT NOT NULL,
    category TEXT,
    rating INTEGER,
    comment TEXT,
    nps_score INTEGER,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    revenue_goal REAL NOT NULL DEFAULT 0,
    units_goal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
  )`,
  `CREATE TABLE IF NOT EXISTS business_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS cash_flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    account TEXT NOT NULL DEFAULT 'banco',
    status TEXT DEFAULT 'pagado',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
]

function migrate() {
  const db = getDb()

  for (const stmt of COLUMN_MIGRATIONS) {
    try { db.exec(stmt) } catch (_) {}
  }

  for (const stmt of NEW_TABLES) {
    try {
      db.exec(stmt)
    } catch (err) {
      console.error('Migration warning:', err.message)
    }
  }

  try {
    db.exec(`UPDATE sales SET gross_sales = total, net_sales = total
             WHERE (gross_sales IS NULL OR gross_sales = 0) AND total > 0`)
  } catch (_) {}

  try {
    db.exec(`UPDATE sales SET mp_commission = payment_fee
             WHERE (mp_commission IS NULL OR mp_commission = 0) AND payment_fee > 0`)
  } catch (_) {}

  console.log('✅ Migrations applied')
}

module.exports = migrate
