import { Outlet, useNavigate } from 'react-router-dom'
import './App.css'
import BottomNav from './modules/ui/BottomNav'
import { useAuth } from './modules/auth/AuthContext'

function App() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell" style={{ paddingBottom: '88px' }}>
      <header style={{ position: 'sticky', top: 0, background: '#fff', padding: '12px 16px', borderBottom: '1px solid #e5e5ea', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Приложение</h1>
        <button onClick={handleLogout} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e5ea', background: '#fff' }}>Выйти</button>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default App
