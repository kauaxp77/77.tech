import { ApiError, type FieldError } from './ApiError'

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api/v1'

/** Trava entre abas, no localStorage porque é o que as abas compartilham. */
export const REFRESH_LOCK_KEY = 'xp77.refresh-lock'
export const REFRESH_LOCK_MS = 10_000

/** Rotas que nunca disparam renovação: um 401 nelas é resposta, não sessão vencida. */
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password',
  '/auth/first-access']

type Listener = () => void

/**
 * O access token fica só na memória desta aba. Guardá-lo no localStorage deixaria
 * qualquer script da página lê-lo; o refresh token, esse, vive no cookie HttpOnly,
 * que o JavaScript não alcança.
 */
function createAccessToken() {
  let value: string | null = null
  const lostListeners = new Set<Listener>()
  return {
    get: () => value,
    set: (token: string | null) => {
      value = token
    },
    /** Avisa quem precisa reagir à sessão perdida (o AuthProvider manda para /entrar). */
    onLost: (listener: Listener) => {
      lostListeners.add(listener)
      return () => lostListeners.delete(listener)
    },
    lose: () => {
      value = null
      lostListeners.forEach((listener) => listener())
    },
  }
}

export const accessToken = createAccessToken()

/** Renovação em andamento nesta aba: chamadas simultâneas esperam a mesma. */
let refreshing: Promise<boolean> | null = null

/** Só para os testes: zera o estado entre um caso e outro. */
export function resetHttpState() {
  accessToken.set(null)
  refreshing = null
}

function lockHeldByAnotherTab(): boolean {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY)
  if (raw === null) {
    return false
  }
  const startedAt = Number(raw)
  // Trava velha é lixo de uma aba que morreu no meio: ignorar, senão ninguém mais renova.
  if (!Number.isFinite(startedAt) || Date.now() - startedAt > REFRESH_LOCK_MS) {
    localStorage.removeItem(REFRESH_LOCK_KEY)
    return false
  }
  return true
}

async function parse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }
  try {
    return await response.json()
  } catch {
    return null
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const error = (body as { error?: Record<string, unknown> } | null)?.error
  const fieldErrors = Array.isArray(error?.['fieldErrors'])
    ? (error['fieldErrors'] as FieldError[])
    : []
  return new ApiError(
    typeof error?.['code'] === 'string' ? error['code'] : 'UNKNOWN',
    response.status,
    typeof error?.['message'] === 'string' ? error['message'] : 'Não foi possível concluir.',
    fieldErrors,
  )
}

/**
 * Troca o refresh token por um access token novo. Uma renovação por vez nesta aba, e
 * nenhuma enquanto outra aba estiver renovando: se duas abas usarem o mesmo refresh
 * token, o backend entende como token copiado e derruba TODAS as sessões da pessoa.
 */
async function refreshSession(): Promise<boolean> {
  if (refreshing) {
    return refreshing
  }
  if (lockHeldByAnotherTab()) {
    return false
  }
  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()))
  refreshing = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        return false
      }
      const body = (await parse(response)) as { data?: { accessToken?: string } } | null
      const token = body?.data?.accessToken
      if (typeof token !== 'string') {
        return false
      }
      accessToken.set(token)
      return true
    } catch {
      return false
    } finally {
      localStorage.removeItem(REFRESH_LOCK_KEY)
      refreshing = null
    }
  })()
  return refreshing
}

async function request<T>(method: string, path: string, body?: unknown, retrying = false): Promise<T> {
  const token = accessToken.get()
  const headers = new Headers()
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw ApiError.offline()
  }

  if (response.ok) {
    const parsed = (await parse(response)) as { data?: T } | null
    return (parsed?.data ?? null) as T
  }

  const payload = await parse(response)

  const mayRefresh = response.status === 401 && !retrying && !NO_REFRESH.some((r) => path.startsWith(r))
  if (mayRefresh) {
    if (await refreshSession()) {
      return request<T>(method, path, body, true)
    }
    accessToken.lose()
  }

  throw toApiError(response, payload)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  /** Login e renovação guardam o token aqui dentro: quem chama não mexe no token. */
  setAccessToken: (token: string | null) => accessToken.set(token),
  refreshSession,
}
