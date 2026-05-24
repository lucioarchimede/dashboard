import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LayoutProvider } from './context/LayoutContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ventas from './pages/Ventas'
import Gastos from './pages/Gastos'
import Productos from './pages/Productos'
import Reportes from './pages/Reportes'
import StockForecast from './pages/StockForecast'
import Configuracion from './pages/Configuracion'
import Clientes from './pages/Clientes'
import CashFlow from './pages/CashFlow'
import Marketing from './pages/Marketing'
import Notas from './pages/Notas'
import { PageLoader } from './components/ui/Spinner'

function Protected({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <PageLoader />
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" replace />
  
  return (
    <LayoutProvider>
      <Layout>{children}</Layout>
    </LayoutProvider>
  )
}

export default function App() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/ventas" element={<Protected><Ventas /></Protected>} />
      <Route path="/gastos" element={<Protected><Gastos /></Protected>} />
      <Route path="/productos" element={<Protected><Productos /></Protected>} />
      <Route path="/clientes" element={<Protected><Clientes /></Protected>} />
      <Route path="/cash-flow" element={<Protected><CashFlow /></Protected>} />
      <Route path="/marketing" element={<Protected><Marketing /></Protected>} />
      <Route path="/notas" element={<Protected><Notas /></Protected>} />
      <Route path="/stock-forecast" element={<Protected><StockForecast /></Protected>} />
      <Route path="/reportes" element={<Protected><Reportes /></Protected>} />
      <Route path="/configuracion" element={<Protected><Configuracion /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}