import { centavosDeReais, reaisDeCentavos } from './dinheiro'

describe('dinheiro', () => {
  it('mostra centavos como reais no formato daqui', () => {
    expect(reaisDeCentavos(800_000)).toBe('8.000,00')
    expect(reaisDeCentavos(0)).toBe('0,00')
    expect(reaisDeCentavos(5)).toBe('0,05')
  })

  it('aceita vírgula, que é como se digita em português', () => {
    expect(centavosDeReais('1500,50')).toBe(150_050)
    expect(centavosDeReais('8.000,00')).toBe(800_000)
  })

  it('aceita ponto, que é o que sai do teclado numérico', () => {
    expect(centavosDeReais('1500.50')).toBe(150_050)
    expect(centavosDeReais('8000')).toBe(800_000)
  })

  it('não perde o centavo que o ponto flutuante come', () => {
    // 15.5 * 100 dá 1550.0000000000002 em JavaScript. Sem arredondar, vira 1550.0000000000002.
    expect(centavosDeReais('15,5')).toBe(1550)
    expect(centavosDeReais('0,07')).toBe(7)
    expect(centavosDeReais('1234,56')).toBe(123_456)
  })

  it('devolve null no que não dá para entender, em vez de zero silencioso', () => {
    expect(centavosDeReais('')).toBeNull()
    expect(centavosDeReais('abc')).toBeNull()
    expect(centavosDeReais('1,2,3')).toBeNull()
    expect(centavosDeReais('R$ 10')).toBeNull()
  })

  it('ida e volta não muda o valor', () => {
    for (const centavos of [0, 1, 99, 150_000, 800_000, 123_456_789]) {
      expect(centavosDeReais(reaisDeCentavos(centavos))).toBe(centavos)
    }
  })
})
