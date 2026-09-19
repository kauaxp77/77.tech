import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Home } from './Home'

describe('porta de entrada pública', () => {
  it('diz o que é o sistema e leva para a tela de entrar', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/77xp/)
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('manda quem procura a empresa para o site, não para o login', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    const site = screen.getByRole('link', { name: /77xp\.tech/ })
    expect(site).toHaveAttribute('href', 'https://77xp.tech')
  })
})
