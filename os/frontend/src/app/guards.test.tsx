import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from './AuthProvider'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import type { Me } from '../api/types'

const me = (role: Me['role']): Me => ({
  id: 'u-1',
  email: 'pessoa@exemplo.com',
  name: 'Pessoa',
  orgId: 'org-1',
  role,
})

const restore = vi.hoisted(() => vi.fn())
const loadMe = vi.hoisted(() => vi.fn())

vi.mock('../api/session', () => ({
  restoreSession: restore,
  loadMe,
  login: vi.fn(),
  logout: vi.fn(),
}))

function app(path: string, children: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/entrar" element={<p>tela de entrar</p>} />
          <Route path="/painel" element={children} />
          <Route path="/minha-conta" element={<p>área do cliente</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('guardas de rota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não pisca a tela de entrar enquanto ainda está verificando a sessão', async () => {
    restore.mockReturnValue(new Promise(() => undefined))

    app('/painel', <RequireAuth><p>painel</p></RequireAuth>)

    expect(screen.queryByText('tela de entrar')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('sem sessão, manda para a tela de entrar', async () => {
    restore.mockResolvedValue(null)

    app('/painel', <RequireAuth><p>painel</p></RequireAuth>)

    expect(await screen.findByText('tela de entrar')).toBeInTheDocument()
  })

  it('com sessão válida, mostra a página', async () => {
    restore.mockResolvedValue(me('OWNER'))

    app('/painel', <RequireAuth><p>painel</p></RequireAuth>)

    expect(await screen.findByText('painel')).toBeInTheDocument()
  })

  it('cliente que tenta o painel vai para a Área do cliente', async () => {
    restore.mockResolvedValue(me('CLIENT'))

    app('/painel', <RequireRole allow={['OWNER', 'ADMIN', 'TEAM']}><p>painel</p></RequireRole>)

    expect(await screen.findByText('área do cliente')).toBeInTheDocument()
  })

  it('equipe entra no painel', async () => {
    restore.mockResolvedValue(me('TEAM'))

    app('/painel', <RequireRole allow={['OWNER', 'ADMIN', 'TEAM']}><p>painel</p></RequireRole>)

    expect(await screen.findByText('painel')).toBeInTheDocument()
  })

  it('tenta restaurar a sessão uma vez ao abrir o site', async () => {
    restore.mockResolvedValue(me('OWNER'))

    app('/painel', <RequireAuth><p>painel</p></RequireAuth>)

    await waitFor(() => expect(restore).toHaveBeenCalledTimes(1))
  })
})
