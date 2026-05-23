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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/notas" element={<Notas />} />
              <Route path="/stock-forecast" element={<StockForecast />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Protected>
        }
      />
    </Routes>
  )
}
