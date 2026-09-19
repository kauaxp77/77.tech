import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import { Entrar } from './Entrar'

const restore = vi.hoisted(() => vi.fn())
const login = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  login,
  logout: vi.fn(),
  loadMe: vi.fn(),
}))

const me = (role: string) => ({
  id: 'u-1',
  email: 'dono@77xp.local',
  name: 'Wendson',
  orgId: 'org-1',
  role,
})

function renderEntrar() {
  return render(
    <MemoryRouter initialEntries={['/entrar']}>
      <AuthProvider>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/painel" element={<p>painel</p>} />
          <Route path="/minha-conta" element={<p>área do cliente</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, senha = 'senha-certa-1') {
  // Espera a verificação inicial da sessão terminar: até lá a tela mostra "Carregando…".
  await user.type(await screen.findByLabelText('E-mail'), 'dono@77xp.local')
  await user.type(screen.getByLabelText('Senha'), senha)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('tela de entrar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restore.mockResolvedValue(null)
  })

  it('leva a equipe para o painel', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue(me('OWNER'))
    renderEntrar()

    await fillAndSubmit(user)

    expect(await screen.findByText('painel')).toBeInTheDocument()
  })

  it('leva o cliente para a Área do cliente', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue(me('CLIENT'))
    renderEntrar()

    await fillAndSubmit(user)

    expect(await screen.findByText('área do cliente')).toBeInTheDocument()
  })

  it('mostra a mensagem da API sem dizer se o e-mail existe', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new ApiError('UNAUTHORIZED', 401, 'E-mail ou senha inválidos.'))
    renderEntrar()

    await fillAndSubmit(user, 'senha-errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.queryByText(/não existe|não encontrado|não cadastrado/i)).not.toBeInTheDocument()
  })

  it('explica a espera quando o limite de tentativas estoura', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(
      new ApiError('RATE_LIMIT_EXCEEDED', 429, 'Limite de requisições excedido'),
    )
    renderEntrar()

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente de novo em um minuto.',
    )
  })

  it('não envia o formulário duas vezes', async () => {
    const user = userEvent.setup()
    login.mockReturnValue(new Promise(() => undefined))
    renderEntrar()

    await fillAndSubmit(user)
    await user.click(screen.getByRole('button', { name: /aguarde/i }))

    expect(login).toHaveBeenCalledTimes(1)
  })
})
