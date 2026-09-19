import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../app/AuthProvider'
import { QueryProvider } from '../../app/QueryProvider'
import type { Me, PriceItem, PriceMultiplier } from '../../api/types'
import { Orcamento } from './Orcamento'

const restore = vi.hoisted(() => vi.fn())
const listItems = vi.hoisted(() => vi.fn())
const listMultipliers = vi.hoisted(() => vi.fn())

vi.mock('../../api/session', () => ({
  restoreSession: restore,
  logout: vi.fn(),
  login: vi.fn(),
  loadMe: vi.fn(),
}))

vi.mock('../../api/catalog', () => ({
  listItems,
  listMultipliers,
  createItem: vi.fn(),
  updateItem: vi.fn(),
  archiveItem: vi.fn(),
  restoreItem: vi.fn(),
  updateMultiplier: vi.fn(),
  reorderItems: vi.fn(),
}))

const dono: Me = { id: 'u-1', email: 'd@77xp.com.br', name: 'W', orgId: 'o-1', role: 'OWNER' }

const itens: PriceItem[] = [
  { id: 'b-1', kind: 'BASE', name: 'Landing Page Simples', priceCents: 150_000, weeks: 1, sortOrder: 1, active: true },
  { id: 'b-2', kind: 'BASE', name: 'Plataforma SaaS', priceCents: 800_000, weeks: 8, sortOrder: 2, active: true },
  // O template de R$ 0 vem primeiro, como na semente de verdade: a tela escolhe o
  // primeiro design sozinha, e se o primeiro custasse dinheiro toda conta mudaria.
  { id: 'd-0', kind: 'DESIGN', name: 'Design Template', priceCents: 0, weeks: 0, sortOrder: 1, active: true },
  { id: 'd-1', kind: 'DESIGN', name: 'Design Exclusivo', priceCents: 150_000, weeks: 2, sortOrder: 2, active: true },
  { id: 'e-1', kind: 'EXTRA', name: 'Login de usuários', priceCents: 200_000, weeks: 1, sortOrder: 1, active: true },
  { id: 'e-2', kind: 'EXTRA', name: 'SEO', priceCents: 80_000, weeks: 1, sortOrder: 2, active: true },
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
          <Orcamento />
        </AuthProvider>
      </MemoryRouter>
    </QueryProvider>,
  )
}

/** O bloco do resumo, onde o total aparece. */
function resumo(): HTMLElement {
  return screen.getByRole('region', { name: /resumo/i })
}

describe('simulador de orçamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listItems.mockResolvedValue(itens)
    listMultipliers.mockResolvedValue(multiplicadores)
  })

  it('começa com o primeiro projeto base escolhido e mostra o total dele', async () => {
    tela()

    expect(await screen.findByLabelText('Projeto base')).toHaveValue('b-1')
    expect(resumo()).toHaveTextContent('1.500,00')
  })

  it('trocar o projeto base muda o total e o prazo', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')

    expect(resumo()).toHaveTextContent('8.000,00')
    expect(resumo()).toHaveTextContent('8 semanas')
  })

  it('marcar um adicional soma no total e no prazo', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')
    await user.click(screen.getByRole('checkbox', { name: /Login de usuários/ }))

    // 8.000 + 2.000 = 10.000; 8 + 1 = 9 semanas.
    expect(resumo()).toHaveTextContent('10.000,00')
    expect(resumo()).toHaveTextContent('9 semanas')
  })

  it('o multiplicador vira uma linha de taxa, para o cliente ver de onde veio', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')
    await user.selectOptions(screen.getByLabelText('Tipo de cobrança'), 'm-2')

    // 8.000 × 1,8 = 14.400. A taxa é a diferença: 6.400.
    expect(resumo()).toHaveTextContent('Taxa')
    expect(resumo()).toHaveTextContent('6.400,00')
    expect(resumo()).toHaveTextContent('14.400,00')
  })

  it('a taxa não acrescenta prazo: ela não é trabalho', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')
    await user.selectOptions(screen.getByLabelText('Tipo de cobrança'), 'm-2')

    expect(resumo()).toHaveTextContent('8 semanas')
  })

  it('o desconto incide sobre o subtotal, não sobre o total com taxa', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')
    await user.selectOptions(screen.getByLabelText('Tipo de cobrança'), 'm-2')
    const desconto = screen.getByLabelText('Desconto (%)')
    await user.clear(desconto)
    await user.type(desconto, '10')

    // 10% de 8.000 = 800 (não 10% de 14.400). Total: 8.000 + 6.400 - 800 = 13.600.
    expect(resumo()).toHaveTextContent('13.600,00')
  })

  it('item escrito na hora entra na conta sem ir para o catálogo', async () => {
    const user = userEvent.setup()
    tela()

    await user.click(await screen.findByRole('button', { name: 'Adicionar item' }))
    await user.type(screen.getByLabelText('Nome do item'), 'Migração de conteúdo')
    await user.type(screen.getByLabelText('Valor (R$)'), '450')
    await user.type(screen.getByLabelText('Semanas do item'), '1')

    // 1.500 (base) + 450 = 1.950
    expect(resumo()).toHaveTextContent('1.950,00')
    expect(resumo()).toHaveTextContent('Migração de conteúdo')
  })

  it('o resumo mostra cada linha, não só o total', async () => {
    const user = userEvent.setup()
    tela()

    await user.selectOptions(await screen.findByLabelText('Projeto base'), 'b-2')
    await user.click(screen.getByRole('checkbox', { name: /SEO/ }))

    expect(resumo()).toHaveTextContent('Plataforma SaaS')
    expect(resumo()).toHaveTextContent('SEO')
  })
})
