import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { setPasswordWithLink } from '../../api/password'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { AuthCard } from './AuthCard'

export const MIN_PASSWORD = 8

type Props = {
  route: '/auth/first-access' | '/auth/reset-password'
  title: string
  subtitle: string
  submitLabel: string
}

/**
 * Corpo comum do primeiro acesso e da redefinição. As duas telas fazem a mesma coisa
 * com links de finalidades diferentes — e a API recusa o link trocado, então o que
 * muda aqui é só a rota e o texto.
 */
export function DefinirSenha({ route, title, subtitle, submitLabel }: Props) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (token === null || token.trim() === '') {
    return (
      <AuthCard title={title} subtitle={subtitle} footer={<PedirOutroLink />}>
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Link inválido ou expirado. Peça um link novo para continuar.
        </p>
      </AuthCard>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldError(null)

    // Confere aqui e a API confere de novo: a tela evita uma ida ao servidor à toa,
    // mas quem manda é o servidor.
    if (password.length < MIN_PASSWORD) {
      setFieldError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirmation) {
      setFieldError('As senhas não são iguais.')
      return
    }

    setSending(true)
    try {
      await setPasswordWithLink(route, token as string, password)
      navigate('/entrar', { replace: true, state: { senhaCriada: true } })
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.userMessage : 'Não foi possível salvar a senha.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      footer={error !== null ? <PedirOutroLink /> : undefined}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`Ao menos ${MIN_PASSWORD} caracteres.`}
          error={fieldError ?? undefined}
        />
        <Field
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {error !== null ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={sending} className="mt-2 w-full">
          {submitLabel}
        </Button>
      </form>
    </AuthCard>
  )
}

function PedirOutroLink() {
  return (
    <Link to="/esqueci-a-senha" className="text-text-secondary hover:text-foreground">
      Pedir outro link
    </Link>
  )
}
