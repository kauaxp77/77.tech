/**
 * Conversão entre o que a pessoa digita (reais) e o que a API guarda (centavos).
 *
 * Existe porque `Number('15,50') * 100` dá NaN, e `15.5 * 100` dá 1550.0000000000002.
 * Os dois erros são silenciosos e custam dinheiro de verdade.
 */

/** "8.000,00" a partir de 800000. */
export function reaisDeCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Centavos a partir do que foi digitado. Aceita vírgula e ponto, com ou sem separador
 * de milhar. Devolve null quando não dá para entender — quem chama decide o que fazer,
 * em vez de receber um zero silencioso.
 */
export function centavosDeReais(digitado: string): number | null {
  const limpo = digitado.trim()
  if (limpo === '') {
    return null
  }

  // "1.234,56" (pt-BR) e "1234.56" (teclado numérico) têm de dar o mesmo número.
  const temVirgula = limpo.includes(',')
  const normalizado = temVirgula ? limpo.replace(/\./g, '').replace(',', '.') : limpo

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
    return null
  }

  // Arredonda em centavos, não em reais: Math.round evita o 1550.0000000000002.
  return Math.round(Number(normalizado) * 100)
}
