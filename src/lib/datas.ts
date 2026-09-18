// Datas sempre no horário de Brasília: o servidor (Vercel/containers) roda em UTC.
const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
})

/** Ex.: "19/09/2026 às 10:00" (horário de Brasília). */
export function formatarDataHora(iso: string | Date): string {
    const partes = Object.fromEntries(
        FORMATO_DATA_HORA.formatToParts(new Date(iso)).map((parte) => [parte.type, parte.value]),
    )
    return `${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`
}
