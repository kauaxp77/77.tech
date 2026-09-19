import { useQuery } from '@tanstack/react-query'
import { loadPortalMe } from '../portal'
import type { PortalMe } from '../types'

export const PORTAL_ME_KEY = ['portal', 'me'] as const

export function usePortalMe() {
  return useQuery<PortalMe>({ queryKey: PORTAL_ME_KEY, queryFn: loadPortalMe })
}
