import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useLayout } from '../../context/LayoutContext'

const TITLES = {
  '/':              'Dashboard',
  '/ventas':        'Ventas',
  '/gastos':        'Gastos',
  '/productos':     'Productos',
  '/clientes':      'Clientes',
  '/cash-flow':     'Flujo de Caja',
  '/marketing':     'Marketing',
  '/stock-forecast': 'Predicción de Stock',
  '/reportes':       'Reportes',
  '/notas':          'Notas',
  '/configuracion':  'Configuración',
}

export function Header({ children }) {
  const { openSidebar } = useLayout()
  const location = useLocation()
  const title = TITLES[location.pathname] || 'EcomDash'

  return (
    <header className="h-[65px] flex-shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-[#27272a] bg-[#09090b] sticky top-0 z-10">
      <button
        onClick={openSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-[#fafafa] transition-colors"
      >
        <Menu size={17} />
      </button>
      <h1 className="font-heading font-semibold text-[15px] text-[#fafafa] flex-1 truncate">{title}</h1>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </header>
  )
}
