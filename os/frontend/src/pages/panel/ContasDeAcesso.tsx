import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/ApiError'
import { invitableRoles, useInvite } from '../../api/hooks/useInvite'
import {
  useBlockMember,
  useMembers,
  useResendInvitation,
  useUnblockMember,
} from '../../api/hooks/useMembers'
import type { Member, Role } from '../../api/types'
import { useAuth } from '../../app/AuthProvider'
import { Button } from '../../ui/Button'
import { Badge, Card, EmptyState, PageHeader } from '../../ui/Card'
import { Field, SelectField } from '../../ui/Field'

const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Dono',
  ADMIN: 'Administrador',
  TEAM: 'Equipe',
  CLIENT: 'Cliente',
}

const STATUS = {
  PENDING: { label: 'Aguardando primeiro acesso', tone: 'warning' },
  ACTIVE: { label: 'Ativa', tone: 'success' },
  BLOCKED: { label: 'Bloqueada', tone: 'danger' },
} as const

function comoData(iso: string | null): string {
  if (iso === null) {
    return 'Nunca entrou'
  }
  return `Último acesso em ${new Date(iso).toLocaleDateString('pt-BR')}`
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ApiError ? erro.userMessage : padrao
}

export function ContasDeAcesso() {
  const { me } = useAuth()
  const members = useMembers()
  const invite = useInvite()
  const block = useBlockMember()
  const unblock = useUnblockMember()
  const resend = useResendInvitation()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const tipos = invitableRoles(me?.role ?? 'CLIENT')
  const [role, setRole] = useState<Role>(tipos[0] ?? 'CLIENT')
  const [aviso, setAviso] = useState<string | null>(null)
  /** Qual linha está perguntando "tem certeza?" e o quê. */
  const [confirmando, setConfirmando] = useState<{ id: string; acao: 'block' | 'unblock' } | null>(
    null,
  )

  async function onInvite(event: FormEvent) {
    event.preventDefault()
    setAviso(null)
    try {
      await invite.mutateAsync({ email, name, role })
      setEmail('')
      setName('')
    } catch {
      // A mensagem sai do próprio invite.error, logo abaixo do campo certo.
    }
  }

  async function agir(id: string, acao: 'block' | 'unblock') {
    setAviso(null)
    setConfirmando(null)
    try {
      await (acao === 'block' ? block : unblock).mutateAsync(id)
    } catch (caught) {
      setAviso(mensagemDe(caught, 'Não foi possível concluir.'))
    }
  }

  async function onResend(id: string) {
    setAviso(null)
    try {
      await resend.mutateAsync(id)
      setAviso('Convite reenviado.')
    } catch (caught) {
      setAviso(mensagemDe(caught, 'Não foi possível reenviar o convite.'))
    }
  }

  /**
   * O backend recusa bloquear o dono e a própria conta. A tela some com o botão para
   * não oferecer um caminho que termina em 403 — mas quem manda é a API.
   */
  function podeBloquear(member: Member): boolean {
    return member.role !== 'OWNER' && member.id !== me?.id
  }

  const erroDoEmail =
    invite.error instanceof ApiError
      ? (invite.error.fieldError('email') ??
        (invite.error.status === 409 ? invite.error.message : undefined))
      : undefined
  const erroGeralDoConvite =
    invite.error instanceof ApiError && erroDoEmail === undefined
      ? invite.error.userMessage
      : undefined

  return (
    <>
      <PageHeader
        title="Contas de acesso"
        description="Quem entra no sistema, com que tipo de conta e em que situação."
      />

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-text-secondary">Convidar</h2>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-text-tertiary">
          A pessoa recebe um e-mail com um link para criar a própria senha. Você não cria senha
          para ninguém — e não precisa saber a senha de ninguém.
        </p>
        <form onSubmit={onInvite} className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]" noValidate>
          <Field
            label="E-mail"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={erroDoEmail}
          />
          <Field
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <SelectField
            label="Tipo de conta"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROLE_LABEL[tipo]}
              </option>
            ))}
          </SelectField>
          <Button type="submit" loading={invite.isPending} className="self-end">
            Convidar
          </Button>
        </form>
        {erroGeralDoConvite !== undefined ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {erroGeralDoConvite}
          </p>
        ) : null}
      </Card>

      {aviso !== null ? (
        <p role="alert" className="glass mb-6 rounded-xl px-4 py-3 text-sm text-text-secondary">
          {aviso}
        </p>
      ) : null}

      {members.isPending ? (
        <p role="status" className="text-sm text-text-tertiary">
          Carregando as contas…
        </p>
      ) : null}

      {members.isError ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {mensagemDe(members.error, 'Não foi possível carregar as contas.')}
        </p>
      ) : null}

      {members.data?.length === 0 ? (
        <EmptyState
          title="Nenhuma conta ainda"
          description="Convide a primeira pessoa no formulário acima."
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {members.data?.map((member) => {
          const situacao = STATUS[member.status]
          const perguntando = confirmando?.id === member.id ? confirmando.acao : null

          return (
            <li key={member.id} aria-label={member.email}>
              <Card className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.name ?? member.email}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {/* O último acesso aparece sempre; o e-mail, só quando o título é o nome. */}
                    {[member.name === null ? null : member.email, comoData(member.lastLoginAt)]
                      .filter((parte) => parte !== null)
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
                  <Badge tone={situacao.tone}>{situacao.label}</Badge>

                  {perguntando === null ? (
                    <>
                      {member.status === 'PENDING' ? (
                        <Button
                          variant="ghost"
                          onClick={() => void onResend(member.id)}
                          loading={resend.isPending && resend.variables === member.id}
                        >
                          Reenviar convite
                        </Button>
                      ) : null}
                      {podeBloquear(member) ? (
                        <Button
                          variant={member.status === 'BLOCKED' ? 'ghost' : 'danger'}
                          onClick={() =>
                            setConfirmando({
                              id: member.id,
                              acao: member.status === 'BLOCKED' ? 'unblock' : 'block',
                            })
                          }
                        >
                          {member.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-text-secondary">
                        {perguntando === 'block'
                          ? 'Bloquear derruba as sessões desta pessoa agora.'
                          : 'A pessoa volta a entrar com a senha que já tem.'}
                      </span>
                      <Button
                        variant={perguntando === 'block' ? 'danger' : 'primary'}
                        onClick={() => void agir(member.id, perguntando)}
                      >
                        {perguntando === 'block' ? 'Sim, bloquear' : 'Sim, desbloquear'}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmando(null)}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </>
  )
}
