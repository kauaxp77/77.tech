import { esperarEmail, limparCaixa, linkDoEmail } from './mailpit'

const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1'

export const DONO = {
  email: process.env['E2E_OWNER_EMAIL'] ?? 'dono@77xp.local',
  senha: 'dono-de-teste-77xp',
}

/** E-mail diferente a cada rodada: convidar duas vezes o mesmo dá 409, e com razão. */
export function emailNovo(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}@e2e.77xp.local`
}

async function post(caminho: string, corpo: unknown): Promise<Response> {
  return fetch(`${API}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

/**
 * Deixa o dono pronto para entrar, pelo caminho de verdade: se a senha ainda não
 * serve, pede "esqueci minha senha", lê o link no Mailpit e cria a senha. Nada de
 * escrever direto no banco — o que o teste exercita é o fluxo que a pessoa usa.
 *
 * Só para o ambiente local de testes. Este arquivo nunca roda em produção.
 */
export async function garantirDono(): Promise<void> {
  const entrada = await post('/auth/login', { email: DONO.email, password: DONO.senha })
  if (entrada.ok) {
    return
  }

  await limparCaixa()
  const pedido = await post('/auth/forgot-password', { email: DONO.email })
  if (!pedido.ok) {
    throw new Error(`A API recusou o pedido de senha do dono: ${pedido.status}`)
  }

  const link = linkDoEmail(await esperarEmail(DONO.email))
  const token = new URLSearchParams(link.split('?')[1] ?? '').get('token')
  const rota = link.startsWith('/primeiro-acesso') ? '/auth/first-access' : '/auth/reset-password'
  const criada = await post(rota, { token, password: DONO.senha })
  if (!criada.ok) {
    throw new Error(`Não deu para criar a senha do dono: ${criada.status}`)
  }

  const segunda = await post('/auth/login', { email: DONO.email, password: DONO.senha })
  if (!segunda.ok) {
    throw new Error(
      `O dono ainda não entra depois de criar a senha (${segunda.status}). ` +
        `BOOTSTRAP_OWNER_EMAIL está como ${DONO.email} na subida da API?`,
    )
  }
}
