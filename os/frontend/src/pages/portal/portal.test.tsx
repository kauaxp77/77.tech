import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import { QueryProvider } from '../../app/QueryProvider'
import type { Me, PortalMe } from '../../api/types'
import { Inicio } from './Inicio'

const restore = vi.hoisted(() => vi.fn())
const loadPortalMe = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  logout: vi.fn(),
  login: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/portal', () => ({ loadPortalMe }))

const cliente: Me = {
  id: 'u-9',
  email: 'carla@empresa.com',
  name: 'Carla Menezes',
  orgId: 'org-1',
  role: 'CLIENT',
}

const portalMe: PortalMe = {
  name: 'Carla Menezes',
  email: 'carla@empresa.com',
  organizationName: '77xp Tech',
}

function tela() {
  restore.mockResolvedValue(cliente)
  return render(
    <QueryProvider>
      <MemoryRouter>
        <AuthProvider>
          <Inicio />
        </AuthProvider>
      </MemoryRouter>
    </QueryProvider>,
  )
}

describe('área do cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadPortalMe.mockResolvedValue(portalMe)
  })

  it('mostra o nome da pessoa e o da organização', async () => {
    tela()

    expect(await screen.findByRole('heading', { name: 'Bem-vindo, Carla' })).toBeInTheDocument()
    expect(screen.getByText('Sua área na 77xp Tech.')).toBeInTheDocument()
  })

  it('sem nome cadastrado, cumprimenta sem inventar nome', async () => {
    loadPortalMe.mockResolvedValue({ ...portalMe, name: null })
    tela()

    expect(await screen.findByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument()
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument()
  })

  // 403 e não 500 de propósito: o TanStack Query repete os 5xx duas vezes antes de
  // desistir, e este teste é sobre a tela mostrar o erro, não sobre a repetição.
  it('erro da API aparece na tela em vez de uma página em branco', async () => {
    loadPortalMe.mockRejectedValue(
      new ApiError('FORBIDDEN', 403, 'Sua conta não tem acesso a esta área.'),
    )
    tela()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sua conta não tem acesso a esta área.',
    )
  })
})
