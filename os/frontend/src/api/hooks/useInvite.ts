import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inviteMember } from '../members'
import { MEMBERS_KEY } from './useMembers'
import type { Member, Role } from '../types'

export type InviteInput = { email: string; name: string; role: Role }

export function useInvite() {
  const client = useQueryClient()
  return useMutation<Member, Error, InviteInput>({
    mutationFn: ({ email, name, role }) => inviteMember(email, name, role),
    onSuccess: () => client.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

/**
 * Quem cada tipo de conta pode convidar (D10). O backend recusa de qualquer jeito;
 * aqui é só para não oferecer na tela um botão que vai dar 403.
 *
 * A ordem é do menos poderoso para o mais poderoso, de propósito: o primeiro da lista
 * é o que vem selecionado. Convidar um cliente sem querer não custa nada; convidar um
 * administrador sem querer entrega a organização.
 */
export function invitableRoles(actor: Role): Role[] {
  if (actor === 'OWNER') {
    return ['CLIENT', 'TEAM', 'ADMIN']
  }
  if (actor === 'ADMIN') {
    return ['CLIENT', 'TEAM']
  }
  return []
}
