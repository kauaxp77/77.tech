import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { accessToken } from '../api/http'
import { login as loginRequest, logout as logoutRequest, restoreSession } from '../api/session'
import type { Me } from '../api/types'

type AuthState = {
  /** null = ninguém logado. Só vale depois de checking virar false. */
  me: Me | null
  /** true enquanto o site ainda não sabe se existe sessão. */
  checking: boolean
  login: (email: string, password: string) => Promise<Me>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    const finish = (restored: Me | null) => {
      if (!cancelled) {
        setMe(restored)
        setChecking(false)
      }
    }
    // O catch não é enfeite: sem ele, uma falha de rede ao abrir o site deixava
    // checking em true para sempre e a tela travava em "Verificando…".
    void restoreSession().then(finish, () => finish(null))
    return () => {
      cancelled = true
    }
  }, [])

  // A sessão pode cair no meio do uso (renovação recusada): a tela precisa saber.
  useEffect(() => accessToken.onLost(() => setMe(null)), [])

  const login = useCallback(async (email: string, password: string) => {
    const logged = await loginRequest(email, password)
    setMe(logged)
    return logged
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      // Sair é sair: mesmo se o servidor não responder, esta aba esquece a sessão.
      setMe(null)
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({ me, checking, login, logout }),
    [me, checking, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const value = use(AuthContext)
  if (value === null) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  }
  return value
}
