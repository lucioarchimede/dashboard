const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ecomdash.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.exec(schema)
db.close()

console.log('✅ Base de datos inicializada correctamente')
