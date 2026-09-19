import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { AuthProvider } from '../../app/AuthProvider'
import { QueryProvider } from '../../app/QueryProvider'
import type { Me, PriceItem, PriceMultiplier } from '../../api/types'
import { Precos } from './Precos'

const restore = vi.hoisted(() => vi.fn())
const listItems = vi.hoisted(() => vi.fn())
const listMultipliers = vi.hoisted(() => vi.fn())
const updateItem = vi.hoisted(() => vi.fn())
const createItem = vi.hoisted(() => vi.fn())
const archiveItem = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  logout: vi.fn(),
  login: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/catalog', () => ({
  listItems,
  listMultipliers,
  updateItem,
  createItem,
  archiveItem,
  restoreItem: vi.fn(),
  updateMultiplier: vi.fn(),
  reorderItems: vi.fn(),
}))

const dono: Me = {
  id: 'u-1',
  email: 'dono@77xp.com.br',
  name: 'Wendson',
  orgId: 'org-1',
  role: 'OWNER',
}

const itens: PriceItem[] = [
  { id: 'i-1', kind: 'BASE', name: 'Landing Page Simples', priceCents: 150_000, weeks: 1, sortOrder: 1, active: true },
  { id: 'i-2', kind: 'BASE', name: 'Plataforma SaaS / Sistema', priceCents: 800_000, weeks: 8, sortOrder: 2, active: true },
  { id: 'i-3', kind: 'EXTRA', name: 'Login de usuários', priceCents: 200_000, weeks: 1, sortOrder: 1, active: true },
]

const multiplicadores: PriceMultiplier[] = [
  { id: 'm-1', name: 'Freelancer', factor: '1.00', sortOrder: 1, active: true },
  { id: 'm-2', name: 'Agência', factor: '1.80', sortOrder: 2, active: true },
]

function tela() {
  restore.mockResolvedValue(dono)
  return render(
    <QueryProvider>
      <MemoryRouter>
        <AuthProvider>
          <Precos />
        </AuthProvider>
      </MemoryRouter>
    </QueryProvider>,
  )
}

async function linhaDe(nome: string): Promise<HTMLElement> {
  return screen.findByRole('listitem', { name: new RegExp(nome) })
}

describe('tabela de preços', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listItems.mockResolvedValue(itens)
    listMultipliers.mockResolvedValue(multiplicadores)
  })

  it('mostra os preços em reais, não em centavos', async () => {
    tela()

    const linha = await linhaDe('Plataforma SaaS')
    // 800.000 centavos são R$ 8.000,00 — mostrar "800000" seria assustador e errado.
    expect(linha).toHaveTextContent('8.000,00')
    expect(linha).not.toHaveTextContent('800000')
  })

  it('mostra o prazo junto do preço, porque cliente pergunta os dois', async () => {
    tela()

    expect(await linhaDe('Plataforma SaaS')).toHaveTextContent('8 semanas')
    expect(await linhaDe('Landing Page Simples')).toHaveTextContent('1 semana')
  })

  it('separa os grupos, porque base é escolha única e extra não', async () => {
    tela()

    expect(await screen.findByRole('heading', { name: /Projeto base/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Adicionais/i })).toBeInTheDocument()
  })

  it('editar um preço manda centavos para a API, não reais', async () => {
    const user = userEvent.setup()
    updateItem.mockResolvedValue({ ...itens[1], priceCents: 950_000 })
    tela()

    const linha = await linhaDe('Plataforma SaaS')
    await user.click(within(linha).getByRole('button', { name: 'Editar' }))

    const preco = within(linha).getByLabelText('Preço (R$)')
    await user.clear(preco)
    await user.type(preco, '9500')
    await user.click(within(linha).getByRole('button', { name: 'Salvar' }))

    expect(updateItem).toHaveBeenCalledWith('i-2', {
      kind: 'BASE',
      name: 'Plataforma SaaS / Sistema',
      priceCents: 950_000,
      weeks: 8,
    })
  })

  it('aceita preço com vírgula', async () => {
    const user = userEvent.setup()
    updateItem.mockResolvedValue(itens[0])
    tela()

    const linha = await linhaDe('Landing Page Simples')
    await user.click(within(linha).getByRole('button', { name: 'Editar' }))
    const preco = within(linha).getByLabelText('Preço (R$)')
    await user.clear(preco)
    await user.type(preco, '1500,50')
    await user.click(within(linha).getByRole('button', { name: 'Salvar' }))

    expect(updateItem).toHaveBeenCalledWith('i-1', expect.objectContaining({ priceCents: 150_050 }))
  })

  it('nome repetido aparece no campo do nome', async () => {
    const user = userEvent.setup()
    updateItem.mockRejectedValue(
      new ApiError('CONFLICT', 409, 'Já existe um item com este nome neste grupo.'),
    )
    tela()

    const linha = await linhaDe('Landing Page Simples')
    await user.click(within(linha).getByRole('button', { name: 'Editar' }))
    await user.click(within(linha).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Já existe um item com este nome neste grupo.')).toBeInTheDocument()
  })

  it('arquivar pergunta antes e avisa que proposta antiga não muda', async () => {
    const user = userEvent.setup()
    archiveItem.mockResolvedValue(undefined)
    tela()

    const linha = await linhaDe('Login de usuários')
    await user.click(within(linha).getByRole('button', { name: 'Arquivar' }))
    expect(archiveItem).not.toHaveBeenCalled()
    expect(within(linha).getByText(/proposta.*não muda|não mudam/i)).toBeInTheDocument()

    await user.click(within(linha).getByRole('button', { name: 'Sim, arquivar' }))
    expect(archiveItem).toHaveBeenCalledWith('i-3')
  })

  it('mostra os multiplicadores com o que eles significam', async () => {
    tela()

    const linha = await linhaDe('Agência')
    expect(linha).toHaveTextContent('1,8')
  })

  it('403 da API vira aviso na tela', async () => {
    listItems.mockRejectedValue(new ApiError('FORBIDDEN', 403, 'Acesso restrito.'))
    tela()

    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso restrito.')
  })
})
