/**
 * A conta do orçamento, do lado da tela.
 *
 * Existe uma segunda implementação em Java (QuoteCalculator), que é a verdade na hora
 * de emitir a proposta. Esta aqui dá o número na hora, enquanto a pessoa monta — pedir
 * ao servidor a cada clique deixaria a tela lenta.
 *
 * Duas implementações divergem, e foi assim que o sistema chegou a ter quatro tabelas
 * de preço. A cerca contra isso é `os/contratos/casos-de-orcamento.json`: os dois lados
 * rodam os mesmos casos, e qualquer diferença quebra o CI.
 *
 * Tudo em centavos inteiros.
 */

export type Linha = { nome: string; centavos: number; semanas: number }

export type Orcamento = {
  linhas: Linha[]
  subtotal: number
  taxa: number
  desconto: number
  total: number
  semanas: number
}

/** Meio centavo para cima, igual ao lado Java (RoundingMode.HALF_UP). */
function arredonda(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor))
}

export function calcular(
  linhas: Linha[],
  multiplicador: number,
  descontoPercent: number,
): Orcamento {
  const subtotal = linhas.reduce((soma, linha) => soma + linha.centavos, 0)
  const semanas = linhas.reduce((soma, linha) => soma + linha.semanas, 0)

  // A taxa é a diferença, não o total multiplicado: o orçamento mostra "Plataforma
  // R$ 8.000" e "Taxa R$ 6.400" em vez de um R$ 14.400 sem explicação.
  const taxa = arredonda(subtotal * multiplicador) - subtotal

  // Incide sobre o SUBTOTAL, não sobre o total com taxa. É a regra que mais se erra.
  const desconto = arredonda((subtotal * descontoPercent) / 100)

  return {
    linhas,
    subtotal,
    taxa,
    desconto,
    total: Math.max(0, subtotal + taxa - desconto),
    semanas,
  }
}
