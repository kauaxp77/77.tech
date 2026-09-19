import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './AuthProvider'
import { Checking } from './Checking'
import { homeFor, type Role } from '../api/types'

/**
 * Esconder o que a pessoa não pode ver é conforto, não segurança: a API recusa de
 * qualquer jeito (403). Aqui só evitamos mostrar uma tela que não é dela.
 */
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { me, checking } = useAuth()

  if (checking) {
    return <Checking />
  }
  if (me === null) {
    return <Navigate to="/entrar" replace />
  }
  if (!allow.includes(me.role)) {
    return <Navigate to={homeFor(me.role)} replace />
  }
  return <>{children}</>
}
