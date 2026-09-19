import { api } from './http'
import type { Member, Role } from './types'

/** Só OWNER e ADMIN chegam aqui: a SecurityConfig do backend recusa o resto com 403. */
export async function listMembers(): Promise<Member[]> {
  return api.get<Member[]>('/admin/users')
}

export async function inviteMember(email: string, name: string, role: Role): Promise<Member> {
  return api.post<Member>('/admin/users/invitations', { email, name, role })
}

/** Manda outro convite. Quem ainda não criou senha perde o link anterior. */
export async function resendInvitation(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/invitation`)
}

export async function blockMember(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/block`)
}

export async function unblockMember(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/unblock`)
}
