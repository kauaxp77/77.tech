export type Role = 'OWNER' | 'ADMIN' | 'TEAM' | 'CLIENT'

/** Quem está logado, vindo de GET /auth/me. */
export type Me = {
  id: string
  email: string
  name: string | null
  orgId: string
  role: Role
}

export type TokenResponse = {
  accessToken: string
  expiresIn: number
  tokenType: string
}

/** Uma conta de acesso na tela "Contas de acesso" (GET /admin/users). */
export type Member = {
  id: string
  email: string
  name: string | null
  role: Role
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED'
  lastLoginAt: string | null
}

export type PortalMe = {
  name: string | null
  email: string
  organizationName: string
}

/** Para onde cada tipo de conta vai depois de entrar. */
export function homeFor(role: Role): string {
  return role === 'CLIENT' ? '/minha-conta' : '/painel'
}
