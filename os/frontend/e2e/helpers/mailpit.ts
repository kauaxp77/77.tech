const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://localhost:8025'

type Resumo = { ID: string; To: { Address: string }[]; Created: string }
type Mensagem = { Text?: string; HTML?: string }

/** Apaga tudo o que está na caixa. Cada teste começa de uma caixa vazia. */
export async function limparCaixa(): Promise<void> {
  const resposta = await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' })
  if (!resposta.ok) {
    throw new Error(`Mailpit não respondeu ao limpar a caixa: ${resposta.status}`)
  }
}

async function listar(): Promise<Resumo[]> {
  const resposta = await fetch(`${MAILPIT}/api/v1/messages?limit=200`)
  if (!resposta.ok) {
    throw new Error(`Mailpit não respondeu: ${resposta.status}. A pilha está de pé?`)
  }
  const corpo = (await resposta.json()) as { messages?: Resumo[] }
  return corpo.messages ?? []
}

/**
 * Espera o e-mail chegar. A API enfileira e um processo separado envia a cada 15 s,
 * então esperar é parte do desenho, não impaciência do teste.
 */
export async function esperarEmail(para: string, segundos = 45): Promise<string> {
  const limite = Date.now() + segundos * 1000
  while (Date.now() < limite) {
    const achado = (await listar())
      .filter((m) => m.To.some((destino) => destino.Address.toLowerCase() === para.toLowerCase()))
      .sort((a, b) => b.Created.localeCompare(a.Created))[0]
    if (achado !== undefined) {
      const detalhe = await fetch(`${MAILPIT}/api/v1/message/${achado.ID}`)
      const corpo = (await detalhe.json()) as Mensagem
      return `${corpo.Text ?? ''}\n${corpo.HTML ?? ''}`
    }
    await new Promise((pronto) => setTimeout(pronto, 1000))
  }
  throw new Error(`Nenhum e-mail para ${para} em ${segundos}s. A fila de e-mails está rodando?`)
}

/** O link de criar senha que veio no e-mail, já como caminho do site. */
export function linkDoEmail(corpo: string): string {
  const achado = /https?:\/\/[^\s"'<>]*\/(primeiro-acesso|redefinir-senha)\?token=[A-Za-z0-9._-]+/.exec(
    corpo,
  )
  if (achado === null) {
    throw new Error(`O e-mail não tem link de senha. Corpo:\n${corpo.slice(0, 500)}`)
  }
  return new URL(achado[0]).pathname + new URL(achado[0]).search
}
