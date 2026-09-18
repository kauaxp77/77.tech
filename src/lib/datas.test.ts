import { describe, expect, it } from 'vitest'
import { formatarDataHora } from './datas'

describe('formatarDataHora', () => {
    it('mostra o horário de Brasília mesmo com o servidor em UTC', () => {
        // 13:00 UTC = 10:00 em Brasília (UTC-3)
        expect(formatarDataHora('2026-09-19T13:00:00.000Z')).toBe('19/09/2026 às 10:00')
    })

    it('vira o dia certo perto da meia-noite', () => {
        // 02:30 UTC do dia 20 = 23:30 do dia 19 em Brasília
        expect(formatarDataHora('2026-09-20T02:30:00.000Z')).toBe('19/09/2026 às 23:30')
    })
})
