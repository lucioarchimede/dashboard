import { useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

export default function Configuracion() {
  const { user } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    setResetting(true)
    try {
      await api.post('/admin/reset-data')
      toast.success('Datos eliminados. Redirigiendo...')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      toast.error(err.message || 'Error al eliminar datos')
    } finally {
      setResetting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header />
      <div className="p-4 md:p-6 space-y-4 max-w-[600px] w-full mx-auto">

        {/* Account info */}
        <Card>
          <CardBody>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1">Usuario</p>
                <p className="text-sm font-medium text-[#fafafa]">{user?.name}</p>
                <p className="text-xs text-[#71717a]">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                  {user?.role}
                </span>
              </div>
              <div className="h-px bg-[#27272a]" />
              <div>
                <p className="text-xs text-[#71717a] uppercase tracking-wider mb-3">Próximas integraciones</p>
                <div className="flex flex-col gap-2">
                  {['API de Shopify', 'Meta Ads API', 'Notificaciones por email', 'Multi-moneda ARS/USD', 'Backup automático'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-[#52525b]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3f3f46]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Danger zone — admin only */}
        {user?.role === 'admin' && (
          <div className="bg-[#111114] border border-red-500/30 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/20 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-400">Zona de peligro</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-[#fafafa] mb-1">Eliminar todos los datos</p>
              <p className="text-xs text-[#71717a] mb-4">
                Borra todos los productos, ventas, gastos y campañas de marketing. Los usuarios no se eliminan. Esta acción <span className="text-red-400 font-medium">no se puede deshacer</span>.
              </p>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setConfirmOpen(true)}
              >
                Eliminar todos los datos
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleReset}
        loading={resetting}
        title="¿Eliminar todos los datos?"
        message="Se borrarán permanentemente todos los productos, ventas, gastos y campañas de marketing. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar todo"
      />
    </div>
  )
}
