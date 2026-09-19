import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { homeFor } from '../../api/types'
import { useAuth } from '../../app/AuthProvider'
import { Checking } from '../../app/Checking'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { AuthCard } from './AuthCard'

export function Entrar() {
  const { me, checking, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (checking) {
    return <Checking />
  }
  // Quem já tem sessão não precisa desta tela: o botão "Entrar" do site cai aqui sempre.
  if (me !== null) {
    return <Navigate to={homeFor(me.role)} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)
    try {
      const logged = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      // Volta para a página que a pessoa tentou abrir, se ela for do tipo de conta dela.
      void navigate(from ?? homeFor(logged.role), { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Não foi possível entrar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard
      title="Entrar"
      subtitle="Acesse o painel da 77xp para acompanhar seus projetos."
      footer={
        <Link to="/esqueci-a-senha" className="text-text-secondary hover:text-foreground">
          Esqueci minha senha
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error !== null ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={sending} className="mt-2 w-full">
          Entrar
        </Button>
      </form>
    </AuthCard>
  )
}
