import { api } from './http'

/**
 * A API responde 204 exista ou não o e-mail, de propósito: qualquer diferença aqui
 * contaria para um estranho quais contas existem.
 */
export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

/** @param route /auth/first-access (convite e dono) ou /auth/reset-password (esqueci). */
export async function setPasswordWithLink(
  route: '/auth/first-access' | '/auth/reset-password',
  token: string,
  password: string,
): Promise<void> {
  await api.post(route, { token, password })
}
