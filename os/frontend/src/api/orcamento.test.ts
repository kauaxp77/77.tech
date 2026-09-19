import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calcular, type Linha } from './orcamento'

type Caso = {
  nome: string
  linhas: Linha[]
  multiplicador: string
  descontoPercent: number
  esperado: { subtotal: number; taxa: number; desconto: number; total: number; semanas: number }
}

const contrato = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../contratos/casos-de-orcamento.json'), 'utf8'),
) as { casos: Caso[] }

describe('conta do orçamento (contrato com o backend)', () => {
  it.each(contrato.casos.map((caso) => [caso.nome, caso] as const))('%s', (_nome, caso) => {
    const resultado = calcular(caso.linhas, Number(caso.multiplicador), caso.descontoPercent)

    expect(resultado.subtotal).toBe(caso.esperado.subtotal)
    expect(resultado.taxa).toBe(caso.esperado.taxa)
    expect(resultado.desconto).toBe(caso.esperado.desconto)
    expect(resultado.total).toBe(caso.esperado.total)
    expect(resultado.semanas).toBe(caso.esperado.semanas)
  })

  it('o arquivo de casos existe e não está vazio — sem ele não há cerca nenhuma', () => {
    expect(contrato.casos.length).toBeGreaterThanOrEqual(8)
  })
})
