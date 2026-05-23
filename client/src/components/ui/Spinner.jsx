export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }
  return (
    <svg className={`animate-spin text-emerald-500 ${sz[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[#1c1c21] rounded ${className}`} />
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-[#1e1e22]">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-4 ${j === 0 ? 'w-32' : j === cols - 1 ? 'w-16' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-5">
      <Skeleton className="h-3 w-20 mb-4" />
      <Skeleton className="h-7 w-36 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
