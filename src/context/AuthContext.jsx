import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { csrfFetch } from '@/utils/csrf'

const AuthContext = createContext(null)

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await parseJson(res)
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email, password) => {
    const res = await csrfFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await parseJson(res)
    if (!res.ok) throw new Error(data.error || 'Daxil olmaq mümkün olmadı.')
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const res = await csrfFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await parseJson(res)
    if (!res.ok) throw new Error(data.error || 'Qeydiyyat mümkün olmadı.')
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const requestVip = async () => {
    const res = await csrfFetch('/api/vip/request', { method: 'POST' })
    const data = await parseJson(res)
    if (!res.ok) throw new Error(data.error || 'Sorğu göndərilmədi.')
    setUser(data.user)
    return data.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, requestVip, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { AuthProvider, useAuth }
