import { api } from './http'
import type { Me, TokenResponse } from './types'

export async function loadMe(): Promise<Me> {
  return api.get<Me>('/auth/me')
}

export async function login(email: string, password: string): Promise<Me> {
  const tokens = await api.post<TokenResponse>('/auth/login', { email, password })
  api.setAccessToken(tokens.accessToken)
  return loadMe()
}

/**
 * Ao abrir o site: tenta trocar o cookie por um access token. Quem fechou a aba ontem
 * e voltou hoje já entra logado, sem passar pela tela de entrar.
 */
export async function restoreSession(): Promise<Me | null> {
  const renewed = await api.refreshSession()
  if (!renewed) {
    return null
  }
  try {
    return await loadMe()
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    // Mesmo que o servidor não responda, esta aba esquece a sessão.
    api.setAccessToken(null)
  }
}
