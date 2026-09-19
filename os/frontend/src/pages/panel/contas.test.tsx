import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import { QueryProvider } from '../../app/QueryProvider'
import type { Me, Member } from '../../api/types'
import { ContasDeAcesso } from './ContasDeAcesso'

const restore = vi.hoisted(() => vi.fn())
const listMembers = vi.hoisted(() => vi.fn())
const inviteMember = vi.hoisted(() => vi.fn())
const resendInvitation = vi.hoisted(() => vi.fn())
const blockMember = vi.hoisted(() => vi.fn())
const unblockMember = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  logout: vi.fn(),
  login: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/members', () => ({
  listMembers,
  inviteMember,
  resendInvitation,
  blockMember,
  unblockMember,
}))

const dono: Me = {
  id: 'u-dono',
  email: 'dono@77xp.com.br',
  name: 'Wendson',
  orgId: 'org-1',
  role: 'OWNER',
}

const member = (over: Partial<Member> & Pick<Member, 'id' | 'email' | 'role' | 'status'>): Member => ({
  name: null,
  lastLoginAt: null,
  ...over,
})

const equipe: Member[] = [
  member({ id: 'u-dono', email: 'dono@77xp.com.br', name: 'Wendson', role: 'OWNER', status: 'ACTIVE' }),
  member({ id: 'u-2', email: 'ana@77xp.com.br', name: 'Ana', role: 'TEAM', status: 'PENDING' }),
  member({ id: 'u-3', email: 'cliente@empresa.com', name: 'Cliente', role: 'CLIENT', status: 'BLOCKED' }),
]

function tela(actor: Me = dono) {
  restore.mockResolvedValue(actor)
  return render(
    <QueryProvider>
      <MemoryRouter>
        <AuthProvider>
          <ContasDeAcesso />
        </AuthProvider>
      </MemoryRouter>
    </QueryProvider>,
  )
}

/** A linha da lista onde aquele e-mail aparece. */
async function linhaDe(email: string): Promise<HTMLElement> {
  return screen.findByRole('listitem', { name: new RegExp(email) })
}

async function convidar(user: ReturnType<typeof userEvent.setup>, email: string, tipo: string) {
  await user.type(await screen.findByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Nome'), 'Pessoa Nova')
  await user.selectOptions(screen.getByLabelText('Tipo de conta'), tipo)
  await user.click(screen.getByRole('button', { name: 'Convidar' }))
}

describe('contas de acesso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMembers.mockResolvedValue(equipe)
  })

  it('mostra as três situações com nome de gente, não de código', async () => {
    tela()

    expect(await screen.findByText('Aguardando primeiro acesso')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText('Bloqueada')).toBeInTheDocument()
  })

  it('mostra o último acesso de cada conta, com nome ou sem', async () => {
    listMembers.mockResolvedValue([
      member({
        id: 'u-2',
        email: 'ana@77xp.com.br',
        name: 'Ana',
        role: 'TEAM',
        status: 'ACTIVE',
        lastLoginAt: '2026-09-10T12:00:00Z',
      }),
      member({ id: 'u-9', email: 'sem-nome@77xp.com.br', role: 'TEAM', status: 'PENDING' }),
    ])
    tela()

    const comNome = await linhaDe('ana@77xp.com.br')
    expect(comNome).toHaveTextContent('Último acesso em 10/09/2026')
    expect(comNome).toHaveTextContent('ana@77xp.com.br')

    const semNome = await linhaDe('sem-nome@77xp.com.br')
    expect(semNome).toHaveTextContent('Nunca entrou')
  })

  it('o dono pode convidar administrador, e "Dono" nunca é opção', async () => {
    tela()

    const tipos = within(await screen.findByLabelText('Tipo de conta'))
      .getAllByRole('option')
      .map((option) => option.textContent)

    // Do menos poderoso para o mais poderoso: o primeiro é o que vem marcado.
    expect(tipos).toEqual(['Cliente', 'Equipe', 'Administrador'])
  })

  it('o administrador não vê "Administrador" nem "Dono" na lista de tipos', async () => {
    tela({ ...dono, id: 'u-admin', role: 'ADMIN' })

    const tipos = within(await screen.findByLabelText('Tipo de conta'))
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(tipos).toEqual(['Cliente', 'Equipe'])
  })

  it('o tipo que vem marcado é o menos poderoso, não o mais', async () => {
    tela()

    expect(await screen.findByLabelText('Tipo de conta')).toHaveValue('CLIENT')
  })

  it('e-mail repetido aparece no campo do e-mail, não num aviso solto', async () => {
    const user = userEvent.setup()
    inviteMember.mockRejectedValue(
      new ApiError('CONFLICT', 409, 'Este e-mail já tem acesso nesta organização.'),
    )
    tela()

    await convidar(user, 'ana@77xp.com.br', 'TEAM')

    const campo = await screen.findByLabelText('E-mail')
    const aviso = await screen.findByText('Este e-mail já tem acesso nesta organização.')
    expect(campo.getAttribute('aria-describedby')).toContain(aviso.id)
  })

  it('bloquear pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup()
    blockMember.mockResolvedValue(undefined)
    tela()

    const linha = await linhaDe('ana@77xp.com.br')
    await user.click(within(linha).getByRole('button', { name: 'Bloquear' }))
    expect(blockMember).not.toHaveBeenCalled()

    await user.click(within(linha).getByRole('button', { name: 'Sim, bloquear' }))
    expect(blockMember).toHaveBeenCalledWith('u-2')
  })

  it('desbloquear também pede confirmação', async () => {
    const user = userEvent.setup()
    unblockMember.mockResolvedValue(undefined)
    tela()

    const linha = await linhaDe('cliente@empresa.com')
    await user.click(within(linha).getByRole('button', { name: 'Desbloquear' }))
    expect(unblockMember).not.toHaveBeenCalled()

    await user.click(within(linha).getByRole('button', { name: 'Sim, desbloquear' }))
    expect(unblockMember).toHaveBeenCalledWith('u-3')
  })

  it('a conta do dono não tem botão de bloquear', async () => {
    tela({ ...dono, id: 'u-admin', role: 'ADMIN' })

    const doDono = await linhaDe('dono@77xp.com.br')
    expect(within(doDono).queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument()
  })

  it('quem está logado não pode bloquear a si mesmo', async () => {
    listMembers.mockResolvedValue([
      ...equipe,
      member({ id: 'u-admin', email: 'admin@77xp.com.br', role: 'ADMIN', status: 'ACTIVE' }),
    ])
    tela({ ...dono, id: 'u-admin', role: 'ADMIN' })

    const minha = await linhaDe('admin@77xp.com.br')
    expect(within(minha).queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument()
  })

  it('403 da API vira aviso na tela, não silêncio', async () => {
    const user = userEvent.setup()
    blockMember.mockRejectedValue(
      new ApiError('FORBIDDEN', 403, 'Só o dono pode convidar ou alterar um administrador.'),
    )
    tela()

    const linha = await linhaDe('ana@77xp.com.br')
    await user.click(within(linha).getByRole('button', { name: 'Bloquear' }))
    await user.click(within(linha).getByRole('button', { name: 'Sim, bloquear' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Só o dono pode convidar ou alterar um administrador.',
    )
  })

  it('reenviar convite só aparece em quem ainda não entrou', async () => {
    const user = userEvent.setup()
    resendInvitation.mockResolvedValue(undefined)
    tela()

    const pendente = await linhaDe('ana@77xp.com.br')
    const ativa = await linhaDe('dono@77xp.com.br')
    expect(within(ativa).queryByRole('button', { name: 'Reenviar convite' })).not.toBeInTheDocument()

    await user.click(within(pendente).getByRole('button', { name: 'Reenviar convite' }))
    expect(resendInvitation).toHaveBeenCalledWith('u-2')
  })

  it('convite aceito limpa o formulário e recarrega a lista', async () => {
    const user = userEvent.setup()
    inviteMember.mockResolvedValue(
      member({ id: 'u-4', email: 'nova@77xp.com.br', role: 'TEAM', status: 'PENDING' }),
    )
    tela()

    await convidar(user, 'nova@77xp.com.br', 'TEAM')

    expect(inviteMember).toHaveBeenCalledWith('nova@77xp.com.br', 'Pessoa Nova', 'TEAM')
    expect(await screen.findByLabelText('E-mail')).toHaveValue('')
    expect(listMembers).toHaveBeenCalledTimes(2)
  })
})
