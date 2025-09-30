import { type FormEvent, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const redirectTo = location.state?.from?.pathname || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Ошибка входа')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center' }}>Вход</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
        />
        {error && (
          <div style={{ color: '#b00020', fontSize: 14 }}>
            {error}
          </div>
        )}
        <button type="submit" style={{ padding: '12px 16px', borderRadius: 8, fontSize: 16 }}>
          Войти
        </button>
      </form>
    </div>
  )
}


