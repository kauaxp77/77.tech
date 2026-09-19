import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('sobe e mostra a marca', () => {
    render(<App />)

    expect(screen.getByRole('heading')).toBeInTheDocument()
    expect(screen.getByText('77xp OS')).toBeInTheDocument()
  })
})
