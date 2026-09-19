import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../api/ApiError'
import { changePassword } from '../../api/password'
import { useAuth } from '../../app/AuthProvider'
import { Button } from '../../ui/Button'
import { Card, PageHeader } from '../../ui/Card'
import { Field } from '../../ui/Field'

const MIN_PASSWORD = 8

/**
 * A mesma tela serve o painel (/painel/conta) e a Área do cliente (/minha-conta/conta):
 * trocar senha e sair é igual para os dois. Duas cópias seriam dois lugares para corrigir
 * o mesmo defeito.
 */
export function Conta() {
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldError(null)
    if (next.length < MIN_PASSWORD) {
      setFieldError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (next !== confirmation) {
      setFieldError('As senhas não são iguais.')
      return
    }

    setSending(true)
    try {
      await changePassword(current, next)
      // A API derruba todas as sessões, inclusive esta: não há para onde voltar.
      void navigate('/entrar', { replace: true, state: { senhaTrocada: true } })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Não foi possível trocar a senha.')
    } finally {
      setSending(false)
    }
  }

  async function onLogout() {
    try {
      await logout()
    } finally {
      // Sai da tela mesmo se a chamada falhar: o token desta aba já foi apagado.
      void navigate('/', { replace: true })
    }
  }

  return (
    <>
      <PageHeader title="Minha conta" description="Seus dados de acesso." />

      {/* items-start: sem isso o cartão da conta esticava até a altura do formulário. */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-text-secondary">Conta</h2>
          <p className="mt-3 text-base font-medium text-foreground">{me?.email}</p>
          {me?.name !== null && me?.name !== undefined ? (
            <p className="text-sm text-text-secondary">{me.name}</p>
          ) : null}
          <Button variant="secondary" onClick={onLogout} className="mt-6">
            Sair
          </Button>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-text-secondary">Trocar senha</h2>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-text-tertiary">
            Ao trocar a senha, você sai de todos os aparelhos e precisa entrar de novo — aqui
            também. É assim de propósito: se alguém tinha a senha antiga, perde o acesso na hora.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
            <Field
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
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
            <Button type="submit" loading={sending} className="mt-1">
              Trocar senha
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}
