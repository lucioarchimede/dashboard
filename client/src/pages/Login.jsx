import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mb-4">
            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-heading font-bold text-2xl text-[#fafafa]">EcomDash</h1>
          <p className="text-sm text-[#71717a] mt-1">Dashboard de rentabilidad</p>
        </div>

        <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6">
          <h2 className="font-heading font-semibold text-base text-[#fafafa] mb-5">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full mt-1" loading={loading}>
              Ingresar
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#27272a]">
            <p className="text-xs text-[#71717a] text-center mb-2">Usuarios de prueba</p>
            <div className="flex flex-col gap-1 text-xs text-[#52525b]">
              <span>gustavo@ecomdash.com / password123</span>
              <span>socio@ecomdash.com / password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
