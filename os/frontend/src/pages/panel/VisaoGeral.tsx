import { useAuth } from '../../app/AuthProvider'
import { Card, EmptyState, PageHeader } from '../../ui/Card'

export function VisaoGeral() {
  const { me } = useAuth()
  const firstName = me?.name?.split(' ')[0] ?? null

  return (
    <>
      <PageHeader
        title={firstName === null ? 'Visão geral' : `Bem-vindo, ${firstName}`}
        description="Aqui vão aparecer seus números: propostas, clientes, assinaturas e projetos."
      />

      <EmptyState
        title="Seu painel está sendo montado"
        description="Os números chegam junto com cada parte do sistema. Por enquanto, o que já funciona
          são as contas de acesso e a sua conta."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Clientes', quando: 'Etapa 3' },
          { label: 'Propostas', quando: 'Etapa 2' },
          { label: 'Projetos', quando: 'Etapa 5' },
        ].map((item) => (
          <Card key={item.label} interactive className="py-5">
            <p className="text-xs font-medium tracking-widest text-text-tertiary uppercase">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-text-tertiary">—</p>
            <p className="mt-1 text-xs text-text-tertiary">Chega na {item.quando}</p>
          </Card>
        ))}
      </div>
    </>
  )
}
