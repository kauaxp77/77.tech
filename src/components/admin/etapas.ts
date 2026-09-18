/** Etapas do funil de leads, na ordem das colunas do quadro. */
export const ETAPAS = [
    { key: "NOVO", nome: "Novos Contatos", marcador: "🟢" },
    { key: "CONTATO", nome: "Em Contato", marcador: "🟡" },
    { key: "NEGOCIACAO", nome: "Negociação", marcador: "🔵" },
    { key: "FECHADO", nome: "Fechado / Ganho", marcador: "🟣" },
    { key: "PERDIDO", nome: "Perdido / Arquivado", marcador: "🔴" },
] as const;

export function nomeDaEtapa(status: string | null | undefined) {
    return ETAPAS.find((etapa) => etapa.key === (status || "NOVO"))?.nome ?? status ?? "Novos Contatos";
}
