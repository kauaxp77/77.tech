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

/**
 * Troca a senha de quem está logado. A senha atual é exigida mesmo com sessão aberta:
 * sessão aberta prova que a pessoa entrou algum dia, não que é ela no teclado agora.
 * Depois disso a API derruba TODAS as sessões — inclusive esta.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword })
}
