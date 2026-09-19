import { render, screen } from '@testing-library/react'
import { App } from './App'

vi.mock('./api/session', () => ({
  restoreSession: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  logout: vi.fn(),
  loadMe: vi.fn(),
}))

describe('App', () => {
  it('sobe e leva quem não tem sessão para a tela de entrar', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})
