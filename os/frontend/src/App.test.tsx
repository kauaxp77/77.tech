import { render, screen } from '@testing-library/react'
import { App } from './App'
import type { Me, Role } from './api/types'

const restore = vi.hoisted(() => vi.fn())
const listMembers = vi.hoisted(() => vi.fn())

vi.mock('./api/session', () => ({
  restoreSession: restore,
  login: vi.fn(),
  logout: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('./api/members', () => ({
  listMembers,
  inviteMember: vi.fn(),
  resendInvitation: vi.fn(),
  blockMember: vi.fn(),
  unblockMember: vi.fn(),
}))

const conta = (role: Role): Me => ({
  id: 'u-1',
  email: 'pessoa@77xp.com.br',
  name: 'Pessoa',
  orgId: 'org-1',
  role,
})

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMembers.mockResolvedValue([])
    window.history.pushState({}, '', '/')
  })

  it('sobe e leva quem não tem sessão para a tela de entrar', async () => {
    restore.mockResolvedValue(null)

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('o dono vê "Contas de acesso" no menu', async () => {
    restore.mockResolvedValue(conta('OWNER'))
    window.history.pushState({}, '', '/painel')

    render(<App />)

    expect(await screen.findAllByRole('link', { name: 'Contas de acesso' })).not.toHaveLength(0)
  })

  it('a equipe não vê "Contas de acesso" nem consegue abrir a rota', async () => {
    restore.mockResolvedValue(conta('TEAM'))
    window.history.pushState({}, '', '/painel/contas')

    render(<App />)

    // Cai de volta na visão geral: a API recusaria com 403 de qualquer jeito.
    expect(await screen.findByRole('heading', { name: /Visão geral|Bem-vindo/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Contas de acesso' })).not.toBeInTheDocument()
    expect(listMembers).not.toHaveBeenCalled()
  })
})
