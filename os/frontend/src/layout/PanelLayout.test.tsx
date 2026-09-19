import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { PanelLayout } from './PanelLayout'

const items = [
  { to: '/painel', label: 'Visão geral' },
  { to: '/painel/contas', label: 'Contas de acesso' },
]

function renderPanel(path = '/painel') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PanelLayout items={items} title="Painel" userName="Wendson">
        <p>conteúdo</p>
      </PanelLayout>
    </MemoryRouter>,
  )
}

describe('PanelLayout', () => {
  it('mostra só as seções que recebeu', () => {
    renderPanel()

    expect(screen.getByRole('link', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contas de acesso' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument()
  })

  it('marca a página atual para quem usa leitor de tela', () => {
    renderPanel('/painel/contas')

    expect(screen.getByRole('link', { name: 'Contas de acesso' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current')
  })

  it('no celular o menu começa fechado e abre no botão', async () => {
    const user = userEvent.setup()
    renderPanel()
    const toggle = screen.getByRole('button', { name: /abrir menu/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    expect(screen.getByRole('button', { name: /fechar menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('fecha o menu ao escolher uma seção', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    await user.click(screen.getAllByRole('link', { name: 'Contas de acesso' })[1]!)

    expect(screen.getByRole('button', { name: /abrir menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('fecha o menu ao apertar Esc', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: /abrir menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
