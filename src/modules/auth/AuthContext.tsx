import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  isAuthenticated: boolean
  currentUser: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem('auth:token')))
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('auth:user'))

  useEffect(() => {
    // keep states in sync if storage changes elsewhere
    const onStorage = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('auth:token')))
      setCurrentUser(localStorage.getItem('auth:user'))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    // Fake auth; accept any non-empty credentials
    if (username.trim() && password.trim()) {
      localStorage.setItem('auth:token', 'dummy-token')
      localStorage.setItem('auth:user', username.trim())
      setIsAuthenticated(true)
      setCurrentUser(username.trim())
    } else {
      throw new Error('Введите логин и пароль')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth:token')
    localStorage.removeItem('auth:user')
    setIsAuthenticated(false)
    setCurrentUser(null)
  }, [])

  const value = useMemo(() => ({ isAuthenticated, currentUser, login, logout }), [isAuthenticated, currentUser, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


