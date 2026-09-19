import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { forgotPassword } from '../../api/password'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { AuthCard } from './AuthCard'

export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)
    try {
      await forgotPassword(email)
      // Sempre a mesma resposta: dizer "não achei esse e-mail" contaria a um estranho
      // quais contas existem. A API já responde igual; a tela acompanha.
      setSent(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard
      title="Esqueci minha senha"
      subtitle="Enviamos um link para você criar uma senha nova."
      footer={
        <Link to="/entrar" className="text-text-secondary hover:text-foreground">
          Voltar para entrar
        </Link>
      }
    >
      {sent ? (
        <p
          role="status"
          className="rounded-xl bg-success/10 px-4 py-3 text-sm leading-relaxed text-success"
        >
          Se este e-mail tiver conta, enviamos o link. Confira sua caixa de entrada — o link
          vale por 1 hora.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {error !== null ? (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" loading={sending} className="mt-2 w-full">
            Enviar link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
