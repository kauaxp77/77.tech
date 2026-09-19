import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listItems, listMultipliers } from '../../api/catalog'
import { centavosDeReais, reaisDeCentavos } from '../../api/dinheiro'
import { calcular, type Linha } from '../../api/orcamento'
import type { PriceItem } from '../../api/types'
import { Button } from '../../ui/Button'
import { Card, PageHeader } from '../../ui/Card'
import { Field, SelectField } from '../../ui/Field'

type ItemProprio = { id: number; nome: string; valor: string; semanas: string }

function semanasEmTexto(quantas: number): string {
  return quantas === 1 ? '1 semana' : `${quantas} semanas`
}

export function Orcamento() {
  const items = useQuery({ queryKey: ['catalog', 'items'], queryFn: () => listItems(false) })
  const multipliers = useQuery({ queryKey: ['catalog', 'multipliers'], queryFn: listMultipliers })

  const [baseId, setBaseId] = useState<string | null>(null)
  const [designId, setDesignId] = useState<string | null>(null)
  const [extras, setExtras] = useState<Set<string>>(new Set())
  const [multiplicadorId, setMultiplicadorId] = useState<string | null>(null)
  const [desconto, setDesconto] = useState('0')
  const [proprios, setProprios] = useState<ItemProprio[]>([])
  const [proximoId, setProximoId] = useState(1)

  const doGrupo = (kind: PriceItem['kind']) => (items.data ?? []).filter((i) => i.kind === kind)

  // Começa no primeiro de cada lista: tela que abre vazia obriga a pessoa a escolher
  // antes de ver qualquer número, e o número é o motivo de ela estar aqui.
  const bases = doGrupo('BASE')
  const designs = doGrupo('DESIGN')
  const baseEscolhida = baseId ?? bases[0]?.id ?? null
  const designEscolhido = designId ?? designs[0]?.id ?? null
  const multiplicadorEscolhido = multiplicadorId ?? multipliers.data?.[0]?.id ?? null

  const orcamento = useMemo(() => {
    const todos = items.data ?? []
    const escolhidos = todos.filter(
      (i) => i.id === baseEscolhida || i.id === designEscolhido || extras.has(i.id),
    )

    const linhas: Linha[] = escolhidos
      // Item de preço zero (design template) não vira linha: poluiria o resumo.
      .filter((i) => i.priceCents > 0)
      .map((i) => ({ nome: i.name, centavos: i.priceCents, semanas: i.weeks }))

    for (const proprio of proprios) {
      const centavos = centavosDeReais(proprio.valor)
      if (proprio.nome.trim() !== '' && centavos !== null) {
        linhas.push({
          nome: proprio.nome,
          centavos,
          semanas: Number(proprio.semanas) || 0,
        })
      }
    }

    const fator = Number(
      (multipliers.data ?? []).find((m) => m.id === multiplicadorEscolhido)?.factor ?? '1',
    )
    return calcular(linhas, fator, Number(desconto) || 0)
  }, [items.data, multipliers.data, baseEscolhida, designEscolhido, extras, proprios, multiplicadorEscolhido, desconto])

  function alternarExtra(id: string) {
    setExtras((atuais) => {
      const novo = new Set(atuais)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        novo.add(id)
      }
      return novo
    })
  }

  // Seletor sem opção nenhuma parece quebrado. Enquanto a tabela não chega, avisa.
  if (items.isPending || multipliers.isPending) {
    return (
      <>
        <PageHeader
          title="Montar orçamento"
          description="Escolha o que o projeto tem. O valor e o prazo saem da tabela de preços."
        />
        <p role="status" className="text-sm text-text-tertiary">
          Carregando a tabela de preços…
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Montar orçamento"
        description="Escolha o que o projeto tem. O valor e o prazo saem da tabela de preços."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
        <Card className="flex flex-col gap-5">
          <SelectField
            label="Projeto base"
            value={baseEscolhida ?? ''}
            onChange={(e) => setBaseId(e.target.value)}
          >
            {bases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — R$ {reaisDeCentavos(item.priceCents)}
              </option>
            ))}
          </SelectField>

          {designs.length > 0 ? (
            <SelectField
              label="Design"
              value={designEscolhido ?? ''}
              onChange={(e) => setDesignId(e.target.value)}
            >
              {designs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.priceCents > 0 ? ` — R$ ${reaisDeCentavos(item.priceCents)}` : ' — incluso'}
                </option>
              ))}
            </SelectField>
          ) : null}

          <fieldset>
            <legend className="text-sm font-medium text-text-secondary">Adicionais</legend>
            <div className="mt-3 grid gap-2">
              {doGrupo('EXTRA').map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border
                    border-white/8 px-3 py-2.5 text-sm transition-colors hover:border-white/15"
                >
                  <input
                    type="checkbox"
                    checked={extras.has(item.id)}
                    onChange={() => alternarExtra(item.id)}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  {/* Sem truncar: nome cortado ("Hospedagem (1 a…") obriga a adivinhar
                      o que se está comprando. Melhor a linha crescer. */}
                  <span className="min-w-0 flex-1 text-foreground">{item.name}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">
                    R$ {reaisDeCentavos(item.priceCents)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Tipo de cobrança"
              value={multiplicadorEscolhido ?? ''}
              onChange={(e) => setMultiplicadorId(e.target.value)}
            >
              {(multipliers.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectField>
            <Field
              label="Desconto (%)"
              inputMode="numeric"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              hint="Negativo acrescenta."
            />
          </div>

          <div>
            {proprios.map((proprio, indice) => (
              <div key={proprio.id} className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Field
                  label={indice === 0 ? 'Nome do item' : `Nome do item ${indice + 1}`}
                  value={proprio.nome}
                  onChange={(e) =>
                    setProprios((lista) =>
                      lista.map((p) => (p.id === proprio.id ? { ...p, nome: e.target.value } : p)),
                    )
                  }
                />
                <Field
                  label={indice === 0 ? 'Valor (R$)' : `Valor ${indice + 1} (R$)`}
                  inputMode="decimal"
                  value={proprio.valor}
                  onChange={(e) =>
                    setProprios((lista) =>
                      lista.map((p) => (p.id === proprio.id ? { ...p, valor: e.target.value } : p)),
                    )
                  }
                />
                <Field
                  label={indice === 0 ? 'Semanas do item' : `Semanas ${indice + 1}`}
                  inputMode="numeric"
                  value={proprio.semanas}
                  onChange={(e) =>
                    setProprios((lista) =>
                      lista.map((p) => (p.id === proprio.id ? { ...p, semanas: e.target.value } : p)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  className="self-end"
                  onClick={() => setProprios((lista) => lista.filter((p) => p.id !== proprio.id))}
                >
                  Remover
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                setProprios((lista) => [
                  ...lista,
                  { id: proximoId, nome: '', valor: '', semanas: '0' },
                ])
                setProximoId((n) => n + 1)
              }}
            >
              Adicionar item
            </Button>
            <p className="mt-2 text-xs text-text-tertiary">
              Item escrito aqui vale só para este orçamento. Para ele entrar na tabela,
              cadastre em Tabela de preços.
            </p>
          </div>
        </Card>

        {/* <section> com nome acessível é uma região de verdade; uma div com
            aria-label não é, e leitor de tela nenhum a anuncia. */}
        <section aria-label="Resumo do orçamento" className="lg:sticky lg:top-6">
          <Card>
          <h2 className="text-sm font-medium text-text-secondary">Resumo</h2>

          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {orcamento.linhas.map((linha, indice) => (
              <li key={`${linha.nome}-${indice}`} className="flex justify-between gap-4">
                <span className="min-w-0 truncate text-text-secondary">{linha.nome}</span>
                <span className="shrink-0 text-foreground">R$ {reaisDeCentavos(linha.centavos)}</span>
              </li>
            ))}
            {orcamento.taxa !== 0 ? (
              <li className="flex justify-between gap-4">
                <span className="text-text-secondary">Taxa</span>
                <span className="text-foreground">R$ {reaisDeCentavos(orcamento.taxa)}</span>
              </li>
            ) : null}
            {orcamento.desconto !== 0 ? (
              <li className="flex justify-between gap-4">
                <span className="text-text-secondary">
                  {orcamento.desconto > 0 ? 'Desconto' : 'Acréscimo'}
                </span>
                <span className="text-success">
                  {orcamento.desconto > 0 ? '−' : '+'} R${' '}
                  {reaisDeCentavos(Math.abs(orcamento.desconto))}
                </span>
              </li>
            ) : null}
          </ul>

          <div className="mt-5 border-t border-white/8 pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-secondary">Total</span>
              <span className="text-2xl font-bold text-foreground">
                R$ {reaisDeCentavos(orcamento.total)}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-tertiary">
              Prazo estimado: {semanasEmTexto(orcamento.semanas)}
            </p>
            </div>
          </Card>
        </section>
      </div>
    </>
  )
}
