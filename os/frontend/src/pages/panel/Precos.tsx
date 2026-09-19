import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../../api/ApiError'
import {
  archiveItem,
  listItems,
  listMultipliers,
  updateItem,
  type PriceItemInput,
} from '../../api/catalog'
import { centavosDeReais, reaisDeCentavos } from '../../api/dinheiro'
import type { PriceItem, PriceMultiplier } from '../../api/types'
import { Button } from '../../ui/Button'
import { Badge, Card, PageHeader } from '../../ui/Card'
import { Field } from '../../ui/Field'

const ITEMS_KEY = ['catalog', 'items'] as const
const MULTIPLIERS_KEY = ['catalog', 'multipliers'] as const

const GROUPS: { kind: PriceItem['kind']; title: string; help: string }[] = [
  {
    kind: 'BASE',
    title: 'Projeto base',
    help: 'Escolhe-se um. É o ponto de partida de todo orçamento.',
  },
  { kind: 'DESIGN', title: 'Design', help: 'Escolhe-se um.' },
  { kind: 'EXTRA', title: 'Adicionais', help: 'Escolhem-se quantos o projeto pedir.' },
]

function semanas(quantas: number): string {
  return quantas === 1 ? '1 semana' : `${quantas} semanas`
}

function mensagem(erro: unknown, padrao: string): string {
  return erro instanceof ApiError ? erro.userMessage : padrao
}

/** Uma linha da tabela: mostra, e vira formulário quando se clica em Editar. */
function LinhaDoItem({ item }: { item: PriceItem }) {
  const client = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(item.name)
  const [preco, setPreco] = useState(reaisDeCentavos(item.priceCents))
  const [prazo, setPrazo] = useState(String(item.weeks))
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null)
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false)

  const recarregar = () => client.invalidateQueries({ queryKey: ITEMS_KEY })

  const salvar = useMutation({
    mutationFn: (input: PriceItemInput) => updateItem(item.id, input),
    onSuccess: () => {
      setEditando(false)
      void recarregar()
    },
  })

  const arquivar = useMutation({
    mutationFn: () => archiveItem(item.id),
    onSuccess: () => {
      setConfirmandoArquivar(false)
      void recarregar()
    },
  })

  function onSalvar() {
    setErroDoCampo(null)
    const centavos = centavosDeReais(preco)
    if (centavos === null || centavos < 0) {
      setErroDoCampo('Informe um preço válido, como 1500 ou 1.500,00.')
      return
    }
    const semanasNovas = Number(prazo)
    if (!Number.isInteger(semanasNovas) || semanasNovas < 0) {
      setErroDoCampo('O prazo é um número de semanas.')
      return
    }
    salvar.mutate({ kind: item.kind, name: nome, priceCents: centavos, weeks: semanasNovas })
  }

  const erroDaApi =
    salvar.error instanceof ApiError ? salvar.error.userMessage : undefined

  return (
    <li aria-label={item.name}>
      <Card className="flex flex-col gap-4 py-4">
        {editando ? (
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end">
            <Field label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Field
              label="Preço (R$)"
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              error={erroDoCampo ?? erroDaApi}
            />
            <Field
              label="Semanas"
              inputMode="numeric"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
            <Button onClick={onSalvar} loading={salvar.isPending}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-text-tertiary">{semanas(item.weeks)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-semibold text-foreground">
                R$ {reaisDeCentavos(item.priceCents)}
              </span>
              {item.active ? null : <Badge tone="neutral">Arquivado</Badge>}
              {confirmandoArquivar ? (
                <>
                  <span className="text-xs text-text-secondary">
                    Some da lista de novos orçamentos. As propostas já feitas não mudam.
                  </span>
                  <Button
                    variant="danger"
                    onClick={() => arquivar.mutate()}
                    loading={arquivar.isPending}
                  >
                    Sim, arquivar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmandoArquivar(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setEditando(true)}>
                    Editar
                  </Button>
                  {item.active ? (
                    <Button variant="ghost" onClick={() => setConfirmandoArquivar(true)}>
                      Arquivar
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </li>
  )
}

function LinhaDoMultiplicador({ multiplier }: { multiplier: PriceMultiplier }) {
  const fator = Number(multiplier.factor)
  return (
    <li aria-label={multiplier.name}>
      <Card className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">{multiplier.name}</p>
          <p className="text-xs text-text-tertiary">
            {fator === 1
              ? 'Sem taxa: o orçamento sai pelo valor dos itens.'
              : `Acrescenta ${Math.round((fator - 1) * 100)}% sobre o subtotal, como "Taxa".`}
          </p>
        </div>
        <span className="text-base font-semibold text-foreground">
          {fator.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}×
        </span>
      </Card>
    </li>
  )
}

export function Precos() {
  const items = useQuery({ queryKey: ITEMS_KEY, queryFn: () => listItems(false) })
  const multipliers = useQuery({ queryKey: MULTIPLIERS_KEY, queryFn: listMultipliers })

  if (items.isError) {
    return (
      <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
        {mensagem(items.error, 'Não foi possível carregar a tabela de preços.')}
      </p>
    )
  }

  return (
    <>
      <PageHeader
        title="Tabela de preços"
        description="O que cada coisa custa e quanto tempo leva. É daqui que sai todo orçamento."
      />

      {items.isPending ? (
        <p role="status" className="text-sm text-text-tertiary">
          Carregando…
        </p>
      ) : null}

      {GROUPS.map((group) => {
        const doGrupo = (items.data ?? []).filter((item) => item.kind === group.kind)
        if (doGrupo.length === 0) {
          return null
        }
        return (
          <section key={group.kind} className="mb-8">
            <h2 className="text-sm font-medium text-text-secondary">{group.title}</h2>
            <p className="mt-1 mb-4 text-xs text-text-tertiary">{group.help}</p>
            <ul className="flex flex-col gap-3">
              {doGrupo.map((item) => (
                <LinhaDoItem key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )
      })}

      {(multipliers.data ?? []).length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-text-secondary">Multiplicadores</h2>
          <p className="mt-1 mb-4 text-xs text-text-tertiary">
            Escolhe-se um por orçamento. Ele vira uma linha separada, para o cliente ver de
            onde veio o valor em vez de receber um total sem explicação.
          </p>
          <ul className="flex flex-col gap-3">
            {(multipliers.data ?? []).map((multiplier) => (
              <LinhaDoMultiplicador key={multiplier.id} multiplier={multiplier} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
