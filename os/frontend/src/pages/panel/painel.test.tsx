import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import type { Me } from '../../api/types'
import { Conta } from '../account/Conta'
import { VisaoGeral } from './VisaoGeral'

const restore = vi.hoisted(() => vi.fn())
const logout = vi.hoisted(() => vi.fn())
const changePassword = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  logout,
  login: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/password', () => ({
  changePassword,
  forgotPassword: vi.fn(),
  setPasswordWithLink: vi.fn(),
}))

const me: Me = {
  id: 'u-1',
  email: 'wendson@77xp.local',
  name: 'Wendson',
  orgId: 'org-1',
  role: 'OWNER',
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/painel" element={<VisaoGeral />} />
          <Route path="/painel/conta" element={<Conta />} />
          <Route path="/entrar" element={<p>tela de entrar</p>} />
          <Route path="/" element={<p>site</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function trocarSenha(user: ReturnType<typeof userEvent.setup>, atual: string) {
  await user.type(await screen.findByLabelText('Senha atual'), atual)
  await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-456')
  await user.type(screen.getByLabelText('Repita a nova senha'), 'senha-nova-456')
  await user.click(screen.getByRole('button', { name: 'Trocar senha' }))
}

describe('painel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restore.mockResolvedValue(me)
  })

  it('a visão geral mostra o nome e diz honestamente que ainda está vazia', async () => {
    renderAt('/painel')

    expect(await screen.findByText(/Wendson/)).toBeInTheDocument()
    expect(screen.getByText(/está sendo montado/i)).toBeInTheDocument()
  })

  it('a conta mostra o e-mail e avisa que trocar a senha derruba as sessões', async () => {
    renderAt('/painel/conta')

    expect(await screen.findByText('wendson@77xp.local')).toBeInTheDocument()
    expect(screen.getByText(/todos os aparelhos|sessões/i)).toBeInTheDocument()
  })

  it('senha atual errada mostra a mensagem da API', async () => {
    const user = userEvent.setup()
    changePassword.mockRejectedValue(
      new ApiError('VALIDATION_ERROR', 422, 'Senha atual incorreta.'),
    )
    renderAt('/painel/conta')

    await trocarSenha(user, 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.')
  })

  it('troca certa leva para entrar, porque a sessão caiu', async () => {
    const user = userEvent.setup()
    changePassword.mockResolvedValue(undefined)
    renderAt('/painel/conta')

    await trocarSenha(user, 'senha-certa-1')

    expect(changePassword).toHaveBeenCalledWith('senha-certa-1', 'senha-nova-456')
    expect(await screen.findByText('tela de entrar')).toBeInTheDocument()
  })

  it('sair encerra a sessão e leva para a tela de entrar', async () => {
    const user = userEvent.setup()
    logout.mockResolvedValue(undefined)
    renderAt('/painel/conta')

    await user.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(logout).toHaveBeenCalledOnce()
    expect(await screen.findByText('tela de entrar')).toBeInTheDocument()
  })
})
