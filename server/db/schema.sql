CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'socio',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  cost_price REAL NOT NULL,
  sale_price REAL NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  supplier TEXT,
  is_active INTEGER DEFAULT 1,
  aroma TEXT DEFAULT 'Original',
  variant TEXT DEFAULT 'single',
  import_cost_per_unit REAL DEFAULT 0,
  packaging_cost REAL DEFAULT 0,
  lot_number TEXT,
  expiry_date DATE,
  units_damaged INTEGER DEFAULT 0,
  units_returned INTEGER DEFAULT 0,
  supplier_lead_time_days INTEGER DEFAULT 7,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  gross_sales REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  net_sales REAL DEFAULT 0,
  shipping_cost REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  payment_fee REAL DEFAULT 0,
  mp_commission REAL DEFAULT 0,
  mp_commission_percent REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  channel TEXT DEFAULT 'shopify',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payment_method TEXT,
  is_repeat_customer INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completada',
  notes TEXT,
  sale_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  recurrence_period TEXT,
  expense_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id),
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id INTEGER,
  movement_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketing_metrics (
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
);

CREATE TABLE IF NOT EXISTS product_feedback (
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
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  revenue_goal REAL NOT NULL DEFAULT 0,
  units_goal INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS business_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_flow (
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
);
