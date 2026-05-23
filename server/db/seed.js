const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'ecomdash.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Clear all data and reset autoincrement counters
db.exec(`
  DELETE FROM stock_movements;
  DELETE FROM marketing_campaigns;
  DELETE FROM expenses;
  DELETE FROM sales;
  DELETE FROM products;
  DELETE FROM users;
`)
try {
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN
    ('users','products','sales','expenses','marketing_campaigns','stock_movements')`)
} catch (_) {}

// ─── USERS ───────────────────────────────────────────────────────────────────
const pw = bcrypt.hashSync('password123', 10)
const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
insertUser.run('Gustavo Archimede', 'gustavo@ecomdash.com', pw, 'admin')
insertUser.run('Socio Demo', 'socio@ecomdash.com', pw, 'socio')

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
// Sales will consume: N001→109 units, N002→106 units. Manual adj: N001 -3 damaged.
// Final stock: N001 = 1500-109-3 = 1388 | N002 = 1500-106 = 1394
const insertProduct = db.prepare(`
  INSERT INTO products (name, sku, category, cost_price, sale_price, current_stock, min_stock, supplier, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const r1 = insertProduct.run('Producto N001', 'N001', 'Principal', 10000, 23000, 1388, 100, 'Proveedor Principal', 1, '2025-11-01', '2026-02-28')
const r2 = insertProduct.run('Producto N002', 'N002', 'Principal', 10000, 23000, 1394, 100, 'Proveedor Principal', 1, '2025-11-01', '2026-02-28')
const PID = [r1.lastInsertRowid, r2.lastInsertRowid]

// ─── LOOKUP TABLES ───────────────────────────────────────────────────────────
// Payment method cycle (10 slots, repeats across all 105 sales)
// Distribution over 105: Transferencia×21, MP Débito×42, MP Crédito 1c×21, MP C3c×11, MP C6c×10
const PAYMENT_CYCLE = [
  'Transferencia Bancaria',
  'MercadoPago (Débito)',
  'MercadoPago (Débito)',
  'MercadoPago (Crédito 1 cuota)',
  'MercadoPago (Crédito 3 cuotas)',
  'Transferencia Bancaria',
  'MercadoPago (Débito)',
  'MercadoPago (Crédito 1 cuota)',
  'MercadoPago (Crédito 6 cuotas)',
  'MercadoPago (Débito)',
]

const PAYMENT_RATE = {
  'Transferencia Bancaria':          0,
  'MercadoPago (Débito)':            0.048,
  'MercadoPago (Crédito 1 cuota)':   0.072,
  'MercadoPago (Crédito 3 cuotas)':  0.1199,
  'MercadoPago (Crédito 6 cuotas)':  0.1599,
}

// Shipping cycle (8 slots): CABA×4, GBA×2, Interior×1, Retiro×1 per cycle
const SHIP_CYCLE = [2500, 3500, 2500, 4500, 2500, 3500, 0, 2500]

const CUSTOMERS = [
  ['Juan Pérez',        'juan.perez@gmail.com'],
  ['María González',    'maria.gonzalez@gmail.com'],
  ['Carlos Rodríguez',  'carlos.rodriguez@gmail.com'],
  ['Laura Martínez',    'laura.martinez@gmail.com'],
  ['Roberto Silva',     'roberto.silva@gmail.com'],
  ['Florencia López',   null],
  ['Matías García',     'mati.garcia@gmail.com'],
  ['Valentina Fernández','vale.fernandez@gmail.com'],
  ['Diego Torres',      'diego.torres@gmail.com'],
  ['Camila Morales',    'cami.morales@gmail.com'],
  ['Sebastián Ruiz',    'sebas.ruiz@gmail.com'],
  ['Lucía Herrera',     'lucia.herrera@gmail.com'],
  ['Nicolás Vargas',    'nico.vargas@gmail.com'],
  ['Sofía Medina',      'sofi.medina@gmail.com'],
  ['Agustín Castro',    'agustin.castro@gmail.com'],
  ['Martina Romero',    'marti.romero@gmail.com'],
  ['Federico Soto',     'fede.soto@gmail.com'],
  ['Ana Jiménez',       null],
  ['Pablo Reyes',       'pablo.reyes@gmail.com'],
  ['Daniela Moreno',    'dani.moreno@gmail.com'],
  ['Tomás Álvarez',     'tomas.alvarez@gmail.com'],
  ['Julieta Rojas',     'juli.rojas@gmail.com'],
  ['Esteban Blanco',    'esteban.b@gmail.com'],
  ['Renata Vega',       'renata.vega@gmail.com'],
  ['Leandro Cruz',      'leandro.c@gmail.com'],
  ['Pilar Ramos',       'pilar.ramos@gmail.com'],
  ['Ignacio Ortega',    'nacho.ortega@gmail.com'],
  ['Belén Delgado',     'belen.d@gmail.com'],
  ['Ezequiel Flores',   'eze.flores@gmail.com'],
  ['Carolina Mendoza',  'caro.mendoza@gmail.com'],
]

// ─── INITIAL STOCK MOVEMENTS ─────────────────────────────────────────────────
const insertMovement = db.prepare(`
  INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, movement_date)
  VALUES (?, ?, ?, ?, ?, ?)
`)
insertMovement.run(PID[0], 'entrada', 1500, 'Stock inicial N001', null, '2025-11-01')
insertMovement.run(PID[1], 'entrada', 1500, 'Stock inicial N002', null, '2025-11-01')

// ─── SALES ───────────────────────────────────────────────────────────────────
// Dec 2025: 35 sales × qty=2 → 70 units → $1,610,000
// Jan 2026: 35 sales × qty=2 + 5 sales × qty=3 → 85 units → $1,955,000
// Feb 2026: 30 sales × qty=2 → 60 units → $1,380,000
// Total: 105 sales, 215 units, $4,945,000

const insertSale = db.prepare(`
  INSERT INTO sales (product_id, quantity, unit_price, total, shipping_cost, platform_fee,
    payment_fee, channel, customer_name, customer_email, payment_method, status, notes, sale_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const SALE_MONTHS = [
  { year: 2025, month: 12, count: 35 },
  { year: 2026, month: 1,  count: 40 },
  { year: 2026, month: 2,  count: 30 },
]

let gi = 0          // global index 0..104
let totalRevenue = 0
let totalSales = 0

for (const m of SALE_MONTHS) {
  // JS Date: month is 0-indexed. new Date(year, month, 0) = last day of (month-1)
  const daysInMonth = new Date(m.year, m.month, 0).getDate()

  for (let j = 0; j < m.count; j++) {
    const productId = PID[gi % 2]
    // Jan 2026: last 5 sales (j=35..39) get qty=3 to reach 85 units in 40 sales
    const qty = (m.month === 1 && j >= 35) ? 3 : 2
    const unitPrice = 23000
    const total = unitPrice * qty

    const payMethod = PAYMENT_CYCLE[gi % 10]
    const paymentFee = Math.round(total * PAYMENT_RATE[payMethod])
    const shippingCost = SHIP_CYCLE[gi % 8]
    const [customerName, customerEmail] = CUSTOMERS[gi % 30]

    const day = Math.min(Math.floor((j / m.count) * daysInMonth) + 1, daysInMonth)
    const saleDate = `${m.year}-${String(m.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const notes = shippingCost === 0 ? 'Retira en local' : null

    const result = insertSale.run(
      productId, qty, unitPrice, total, shippingCost, 0, paymentFee,
      'shopify', customerName, customerEmail, payMethod, 'completada', notes, saleDate
    )

    insertMovement.run(productId, 'salida', qty, 'Venta', result.lastInsertRowid, saleDate)

    totalRevenue += total
    totalSales++
    gi++
  }
}

// Manual stock adjustment (3 units of N001 damaged in January)
insertMovement.run(PID[0], 'ajuste', 3, 'Ajuste por productos dañados', null, '2026-01-15')

// ─── EXPENSES ────────────────────────────────────────────────────────────────
const insertExpense = db.prepare(`
  INSERT INTO expenses (category, subcategory, description, amount, is_recurring, recurrence_period, expense_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

// Recurring — 4 expenses × 3 months = 12 rows — $295,500 total
const RECURRING = [
  ['Plataforma', 'Plan Shopify',    'Plan Shopify Básico',            30000],
  ['Plataforma', 'Dominio',         'Dominio + hosting',               3500],
  ['Operativos', 'Almacenamiento',  'Alquiler de depósito/espacio',   50000],
  ['Operativos', 'Servicios',       'Internet + servicios',           15000],
]
for (const [year, month] of [[2025, 12], [2026, 1], [2026, 2]]) {
  const d = `${year}-${String(month).padStart(2, '0')}-01`
  for (const [cat, sub, desc, amt] of RECURRING) {
    insertExpense.run(cat, sub, desc, amt, 1, 'mensual', d)
  }
}

// Variable — 12 rows — $786,000 total
const VARIABLE = [
  // December 2025 — $240,000
  ['Marketing',  'Meta Ads',        'Campaña Meta Ads - Diciembre',            150000, '2025-12-01'],
  ['Operativos', 'Packaging',       'Cajas, bolsas, papel de regalo',           35000, '2025-12-05'],
  ['Operativos', 'Etiquetas',       'Etiquetas de productos',                   12000, '2025-12-10'],
  ['Impuestos',  'Ingresos Brutos', 'Adelanto IIBB - Diciembre',                25000, '2025-12-15'],
  ['Otros',      'Varios',          'Gastos varios (movilidad, etc)',            18000, '2025-12-20'],
  // January 2026 — $333,000
  ['Marketing',  'Meta Ads',        'Campaña Meta Ads - Enero',                200000, '2026-01-02'],
  ['Operativos', 'Packaging',       'Restock packaging',                        45000, '2026-01-08'],
  ['Operativos', 'Herramientas',    'Canva Pro + herramientas diseño',           8000, '2026-01-10'],
  ['Marketing',  'Influencer',      'Colaboración con micro-influencer',        80000, '2026-01-15'],
  // February 2026 — $213,000
  ['Marketing',  'Meta Ads',        'Campaña Meta Ads - Febrero',              120000, '2026-02-01'],
  ['Operativos', 'Packaging',       'Packaging febrero',                        28000, '2026-02-10'],
  ['Impuestos',  'IVA',             'IVA bimestral',                            65000, '2026-02-20'],
]
for (const [cat, sub, desc, amt, date] of VARIABLE) {
  insertExpense.run(cat, sub, desc, amt, 0, null, date)
}

// ─── MARKETING CAMPAIGNS ─────────────────────────────────────────────────────
// Total: $470,000 invested | $2,116,000 revenue attributed | ROAS avg ~4.5x
const insertCampaign = db.prepare(`
  INSERT INTO marketing_campaigns (name, platform, budget_spent, impressions, clicks,
    conversions, revenue_attributed, start_date, end_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const CAMPAIGNS = [
  ['Campaña Navidad - Conversión',       'Meta Ads',  150000, 285000, 4200, 28, 644000, '2025-12-01', '2025-12-31', 'Campaña enfocada en regalos de Navidad. CTR 1.47%, CAC $5.357'],
  ['Enero - Rebajas Post-Fiestas',       'Meta Ads',  120000, 310000, 5200, 25, 575000, '2026-01-02', '2026-01-20', 'Aprovechando rebajas de enero. CTR 1.68%, CAC $4.800'],
  ['Influencer Collab - @fashionista_arg','Instagram',  80000,  45000,  890, 12, 276000, '2026-01-15', '2026-01-22', 'Micro-influencer, código de descuento exclusivo. ROAS 3.45x'],
  ['San Valentín - Prospecting',         'Meta Ads',   85000, 420000, 6100, 18, 414000, '2026-02-01', '2026-02-14', 'Prospecting San Valentín. CTR 1.45%, CAC $4.722'],
  ['Retargeting - Carrito Abandonado',   'Meta Ads',   35000,  95000, 2100,  9, 207000, '2026-02-01', '2026-02-28', 'Mejor ROAS del período: 5.91x. CTR 2.21%, CAC $3.889'],
]
for (const [name, plat, budget, imp, clicks, conv, rev, start, end, notes] of CAMPAIGNS) {
  insertCampaign.run(name, plat, budget, imp, clicks, conv, rev, start, end, notes)
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const totalExpenses = (30000 + 3500 + 50000 + 15000) * 3 + // recurring
  150000 + 35000 + 12000 + 25000 + 18000 +                 // dec variable
  200000 + 45000 + 8000 + 80000 +                          // jan variable
  120000 + 28000 + 65000                                    // feb variable

console.log('✅ Seed completado')
console.log(`   - 2 usuarios (gustavo@ecomdash.com / socio@ecomdash.com — password: password123)`)
console.log(`   - 2 productos: N001 stock=${1388} | N002 stock=${1394} (total 2782)`)
console.log(`   - ${totalSales} ventas | Ingresos: $${totalRevenue.toLocaleString('es-AR')}`)
console.log(`   - 24 gastos operativos | Total: $${totalExpenses.toLocaleString('es-AR')}`)
console.log(`   - 5 campañas de marketing | Inversión: $470.000`)
console.log(`   - COGS estimado: $${(215 * 10000).toLocaleString('es-AR')} (215 unidades × $10.000)`)
console.log(`   - Ganancia bruta estimada: ~$2.233.000 (antes de gastos operativos)`)
console.log(`   - Margen neto estimado: ~${((totalRevenue - 215*10000 - totalExpenses) / totalRevenue * 100).toFixed(1)}%`)

db.close()
