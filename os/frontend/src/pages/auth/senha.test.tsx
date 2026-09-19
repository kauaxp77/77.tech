import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import { EsqueciSenha } from './EsqueciSenha'
import { PrimeiroAcesso } from './PrimeiroAcesso'
import { RedefinirSenha } from './RedefinirSenha'

const forgotPassword = vi.hoisted(() => vi.fn())
const setPasswordWithLink = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  logout: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/password', () => ({ forgotPassword, setPasswordWithLink }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
          <Route path="/entrar" element={<p>tela de entrar</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillPasswords(
  user: ReturnType<typeof userEvent.setup>,
  senha: string,
  confirmacao = senha,
) {
  await user.type(await screen.findByLabelText('Nova senha'), senha)
  await user.type(screen.getByLabelText('Repita a nova senha'), confirmacao)
  await user.click(screen.getByRole('button', { name: /criar senha|salvar nova senha/i }))
}

describe('telas de senha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sem token na URL, o link é recusado sem chamar a API', async () => {
    renderAt('/primeiro-acesso')

    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou expirado')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(setPasswordWithLink).not.toHaveBeenCalled()
  })

  it('senha curta é barrada antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderAt('/primeiro-acesso?token=abc')

    await fillPasswords(user, 'curta')

    // role=alert é a mensagem de erro do campo; a dica embaixo dele diz algo parecido.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A senha precisa ter ao menos 8 caracteres.',
    )
    expect(setPasswordWithLink).not.toHaveBeenCalled()
  })

  it('senhas diferentes são barradas antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderAt('/primeiro-acesso?token=abc')

    await fillPasswords(user, 'senha-forte-1', 'senha-forte-2')

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não são iguais.')
    expect(setPasswordWithLink).not.toHaveBeenCalled()
  })

  it('primeiro acesso usa a rota de primeiro acesso e leva para entrar', async () => {
    const user = userEvent.setup()
    setPasswordWithLink.mockResolvedValue(undefined)
    renderAt('/primeiro-acesso?token=abc')

    await fillPasswords(user, 'senha-forte-1')

    expect(setPasswordWithLink).toHaveBeenCalledWith('/auth/first-access', 'abc', 'senha-forte-1')
    expect(await screen.findByText('tela de entrar')).toBeInTheDocument()
  })

  it('redefinição usa a rota de redefinição', async () => {
    const user = userEvent.setup()
    setPasswordWithLink.mockResolvedValue(undefined)
    renderAt('/redefinir-senha?token=xyz')

    await fillPasswords(user, 'senha-forte-1')

    expect(setPasswordWithLink).toHaveBeenCalledWith('/auth/reset-password', 'xyz', 'senha-forte-1')
  })

  it('link vencido mostra a mensagem da API e oferece pedir outro', async () => {
    const user = userEvent.setup()
    setPasswordWithLink.mockRejectedValue(
      new ApiError('CLIENT_ERROR', 400, 'Link inválido ou expirado'),
    )
    renderAt('/redefinir-senha?token=velho')

    await fillPasswords(user, 'senha-forte-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou expirado')
    expect(screen.getByRole('link', { name: /pedir outro link/i })).toBeInTheDocument()
  })

  it('esqueci a senha responde igual para e-mail que existe e que não existe', async () => {
    const user = userEvent.setup()
    forgotPassword.mockResolvedValue(undefined)
    renderAt('/esqueci-a-senha')

    await user.type(await screen.findByLabelText('E-mail'), 'qualquer@exemplo.com')
    await user.click(screen.getByRole('button', { name: /enviar link/i }))

    // A API responde igual de propósito; a tela não pode estragar isso.
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se este e-mail tiver conta, enviamos o link',
    )
    expect(screen.queryByText(/não encontrado|não existe/i)).not.toBeInTheDocument()
  })
})
