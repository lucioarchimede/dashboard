export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('es-AR').format(value)
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  return `${value >= 0 ? '+' : ''}${Number(value).toFixed(decimals)}%`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatDateInput(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function startOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function endOfMonth(date = new Date()) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return last.toISOString().split('T')[0]
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
