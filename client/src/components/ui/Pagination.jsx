import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, total, limit, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
      <div className="flex items-center gap-3">
        <p className="text-xs text-[#52525b]">
          {total === 0 ? '0 resultados' : `${start}–${end} de ${total}`}
        </p>
        {onLimitChange && (
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            className="bg-[#18181b] border border-[#27272a] rounded text-xs text-[#a1a1aa] px-2 py-1 focus:outline-none focus:border-emerald-500"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / pág</option>)}
          </select>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-[#18181b] disabled:opacity-30 text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-[#52525b] text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-1 rounded text-xs transition-colors ${
                  p === page
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa]'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-[#18181b] disabled:opacity-30 text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
