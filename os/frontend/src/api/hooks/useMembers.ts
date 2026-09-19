import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blockMember, listMembers, resendInvitation, unblockMember } from '../members'
import type { Member } from '../types'

export const MEMBERS_KEY = ['members'] as const

export function useMembers() {
  return useQuery<Member[]>({ queryKey: MEMBERS_KEY, queryFn: listMembers })
}

/**
 * Bloquear, desbloquear e reenviar mudam o que está na lista, então a lista é
 * recarregada depois de cada um. Nada de remendar a linha na memória: o backend é
 * quem sabe a situação de verdade.
 */
function useMemberAction(action: (id: string) => Promise<void>) {
  const client = useQueryClient()
  return useMutation({
    // Repassa só o id: o TanStack Query manda um segundo argumento de contexto que
    // a camada de API não conhece nem quer conhecer.
    mutationFn: (id: string) => action(id),
    onSuccess: () => client.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useBlockMember() {
  return useMemberAction(blockMember)
}

export function useUnblockMember() {
  return useMemberAction(unblockMember)
}

export function useResendInvitation() {
  return useMemberAction(resendInvitation)
}
