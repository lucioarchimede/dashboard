export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 bg-[#111114] border border-[#27272a] rounded-lg p-1 ${className}`}>
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
            value === tab.value
              ? 'bg-[#27272a] text-[#fafafa]'
              : 'text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function UnderlineTabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-0 border-b border-[#27272a] ${className}`}>
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 -mb-px ${
            value === tab.value
              ? 'border-emerald-500 text-[#fafafa]'
              : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
              value === tab.value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-[#52525b]'
            }`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
