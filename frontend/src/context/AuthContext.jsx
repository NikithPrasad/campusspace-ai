import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // The token lives in an HTTP-only cookie, so we ask the server who we are.
  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    setUser(res.data.user)
    return res.data.user
  }, [])

  const register = useCallback(async (payload) => {
    const res = await api.post('/api/auth/register', payload)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
