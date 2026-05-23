import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingCart, Receipt, Package,
  BarChart3, Settings, LogOut, TrendingUp, X, LineChart,
  Users, Wallet, StickyNote, Megaphone
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLayout } from '../../context/LayoutContext'
import { useState, useEffect } from 'react'
import { api } from '../../utils/api'

const NAV = [
  { path: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/ventas',        icon: ShoppingCart,    label: 'Ventas' },
  { path: '/gastos',        icon: Receipt,         label: 'Gastos' },
  { path: '/productos',     icon: Package,         label: 'Productos' },
  { path: '/clientes',      icon: Users,           label: 'Clientes' },
  { path: '/cash-flow',     icon: Wallet,          label: 'Flujo de Caja' },
  { path: '/marketing',     icon: Megaphone,       label: 'Marketing' },
  { path: '/stock-forecast', icon: LineChart,      label: 'Predicción Stock' },
  { path: '/reportes',      icon: BarChart3,       label: 'Reportes' },
  { path: '/notas',         icon: StickyNote,      label: 'Notas' },
]

function NavItem({ path, icon: Icon, label, badge, onClick }) {
  const location = useLocation()
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  return (
    <NavLink
      to={path}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
        isActive
          ? 'bg-[#18181b] text-[#fafafa]'
          : 'text-[#71717a] hover:bg-[#18181b]/70 hover:text-[#a1a1aa]'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-emerald-500 rounded-r-full" />
      )}
      <Icon size={17} strokeWidth={1.75} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth()
  const [stockAlerts, setStockAlerts] = useState(0)

  useEffect(() => {
    api.get('/stock/alerts').then(a => setStockAlerts(a.length)).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#111114] border-r border-[#27272a]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[65px] border-b border-[#27272a] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-heading font-bold text-[15px] text-[#fafafa]">EcomDash</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-colors lg:hidden"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(item => (
          <NavItem
            key={item.path}
            {...item}
            badge={item.path === '/productos' ? stockAlerts : 0}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 pt-2 border-t border-[#27272a] flex flex-col gap-0.5">
        <NavItem path="/configuracion" icon={Settings} label="Configuración" onClick={onClose} />

        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#fafafa] truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] text-[#52525b] truncate leading-tight">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-red-400 transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useLayout()

  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile — animated overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[200] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeSidebar}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute left-0 top-0 bottom-0 w-60"
            >
              <SidebarContent onClose={closeSidebar} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
