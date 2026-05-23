const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'ecomdash.db')
const db = new Database(DB_PATH)

console.log('🗑️  Limpiando datos...')

db.exec(`
  DELETE FROM stock_movements;
  DELETE FROM sales;
  DELETE FROM expenses;
  DELETE FROM products;
  DELETE FROM cash_flow;
  DELETE FROM marketing_metrics;
  DELETE FROM product_feedback;
  DELETE FROM business_notes;
  DELETE FROM goals;
`)

try { db.exec(`DELETE FROM marketing_campaigns`) } catch (_) {}

try {
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN
    ('products','sales','expenses','stock_movements','cash_flow',
     'marketing_metrics','product_feedback','business_notes','goals','marketing_campaigns')`)
} catch (_) {}

console.log('✅ Datos eliminados correctamente.')
console.log('   Usuarios conservados. La base de datos está lista para datos reales.')

db.close()
