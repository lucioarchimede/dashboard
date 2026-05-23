export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[640px] border-collapse">{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead className="sticky top-0 bg-[#111114] z-[1]">
      {children}
    </thead>
  )
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Th({ children, className = '', align = 'left' }) {
  const al = { left: 'text-left', right: 'text-right', center: 'text-center' }
  return (
    <th className={`px-4 py-3 ${al[align]} text-[11px] font-semibold text-[#52525b] uppercase tracking-wider border-b border-[#27272a] whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

export function Tr({ children, className = '', onClick, disabled }) {
  return (
    <tr
      onClick={disabled ? undefined : onClick}
      className={`border-b border-[#1e1e22] last:border-0 transition-colors duration-100 ${onClick && !disabled ? 'cursor-pointer hover:bg-[#18181b]' : 'hover:bg-[#18181b]/40'} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '', align = 'left', muted = false }) {
  const al = { left: 'text-left', right: 'text-right', center: 'text-center' }
  return (
    <td className={`px-4 py-3 text-sm ${al[align]} ${muted ? 'text-[#71717a]' : 'text-[#fafafa]'} ${className}`}>
      {children}
    </td>
  )
}
