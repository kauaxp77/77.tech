import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { Checking } from './Checking'

/**
 * Enquanto o site não sabe se existe sessão, mostra carregando — mandar para a tela de
 * entrar antes da resposta faria a tela piscar para quem já estava logado.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, checking } = useAuth()
  const location = useLocation()

  if (checking) {
    return <Checking />
  }
  if (me === null) {
    // Guarda para onde a pessoa ia: depois de entrar, ela volta para lá.
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
