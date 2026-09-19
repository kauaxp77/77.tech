import { api } from './http'
import type { PortalMe } from './types'

/** Só CLIENT chega aqui: a SecurityConfig do backend recusa o resto com 403. */
export async function loadPortalMe(): Promise<PortalMe> {
  return api.get<PortalMe>('/portal/me')
}
