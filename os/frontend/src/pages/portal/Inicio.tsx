import { ApiError } from '../../api/ApiError'
import { usePortalMe } from '../../api/hooks/usePortalMe'
import { Card, EmptyState, PageHeader } from '../../ui/Card'

export function Inicio() {
  const portal = usePortalMe()
  const primeiroNome = portal.data?.name?.split(' ')[0] ?? null

  if (portal.isPending) {
    return (
      <p role="status" className="text-sm text-text-tertiary">
        Carregando…
      </p>
    )
  }

  if (portal.isError) {
    return (
      <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
        {portal.error instanceof ApiError
          ? portal.error.userMessage
          : 'Não foi possível carregar seus dados.'}
      </p>
    )
  }

  return (
    <>
      <PageHeader
        title={primeiroNome === null ? 'Bem-vindo' : `Bem-vindo, ${primeiroNome}`}
        description={`Sua área na ${portal.data.organizationName}.`}
      />

      <EmptyState
        title="Ainda não há nada para acompanhar"
        description="Quando houver propostas, projetos ou documentos para você, eles aparecem aqui.
          Por enquanto, esta área serve para você entrar e cuidar da sua senha."
      />

      <Card className="mt-6">
        <h2 className="text-sm font-medium text-text-secondary">Seus dados</h2>
        <p className="mt-3 text-base font-medium text-foreground">
          {portal.data.name ?? portal.data.email}
        </p>
        {portal.data.name === null ? null : (
          <p className="text-sm text-text-secondary">{portal.data.email}</p>
        )}
        <p className="mt-4 text-xs text-text-tertiary">
          Para mudar seu nome ou e-mail, fale com a {portal.data.organizationName} — assim
          ninguém troca o próprio e-mail de acesso sozinho.
        </p>
      </Card>
    </>
  )
}
