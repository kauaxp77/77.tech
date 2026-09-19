/**
 * Cria contas de exemplo no ambiente LOCAL, para as fotos da documentação mostrarem
 * as três situações (aguardando, ativa, bloqueada) em vez de uma lista vazia.
 *
 * NUNCA rode isto contra produção. Ele só fala com http://localhost:8080 por padrão,
 * e recusa qualquer endereço que não seja local.
 *
 *   docker compose -f os/docker-compose.yml up -d   (com BOOTSTRAP_OWNER_EMAIL)
 *   cd os/frontend && node scripts/dados-de-exemplo.mjs
 *
 * Tudo nasce pelo caminho de verdade — convite, e-mail, link de primeiro acesso —
 * porque dado inserido direto no banco não prova que o fluxo funciona.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025'
const DONO = {
  email: process.env.E2E_OWNER_EMAIL ?? 'dono@77xp.local',
  senha: process.env.E2E_OWNER_PASSWORD ?? 'dono-de-teste-77xp',
}

// Trava de segurança: sem isto, um copiar-e-colar distraído cria contas em produção.
for (const [nome, url] of [['API', API], ['Mailpit', MAILPIT]]) {
  const host = new URL(url).hostname
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`${nome} aponta para ${host}. Este script só roda contra a máquina local.`)
  }
}

async function post(caminho, corpo, token) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })
  return resposta
}

async function esperarLink(para, segundos = 60) {
  const limite = Date.now() + segundos * 1000
  while (Date.now() < limite) {
    const lista = await fetch(`${MAILPIT}/api/v1/messages?limit=200`).then((r) => r.json())
    const achado = (lista.messages ?? [])
      .filter((m) => m.To.some((t) => t.Address.toLowerCase() === para.toLowerCase()))
      .sort((a, b) => b.Created.localeCompare(a.Created))[0]
    if (achado !== undefined) {
      const corpo = await fetch(`${MAILPIT}/api/v1/message/${achado.ID}`).then((r) => r.json())
      const texto = `${corpo.Text ?? ''}\n${corpo.HTML ?? ''}`
      const link = /https?:\/\/[^\s"'<>]*\/(primeiro-acesso|redefinir-senha)\?token=[\w.-]+/.exec(texto)
      if (link !== null) {
        return link[0]
      }
    }
    await new Promise((pronto) => setTimeout(pronto, 1000))
  }
  throw new Error(`Nenhum e-mail com link para ${para} em ${segundos}s.`)
}

function tokenDoLink(link) {
  return new URL(link).searchParams.get('token')
}

async function garantirDono() {
  if ((await post('/auth/login', { email: DONO.email, password: DONO.senha })).ok) {
    return
  }
  console.log('O dono ainda não tem senha; criando pelo link do e-mail…')
  const link = await esperarLink(DONO.email)
  const rota = link.includes('/primeiro-acesso') ? '/auth/first-access' : '/auth/reset-password'
  const criada = await post(rota, { token: tokenDoLink(link), password: DONO.senha })
  if (!criada.ok) {
    throw new Error(`Não deu para criar a senha do dono: ${criada.status}`)
  }
}

async function entrarComoDono() {
  const resposta = await post('/auth/login', { email: DONO.email, password: DONO.senha })
  const corpo = await resposta.json()
  return corpo.data.accessToken
}

const PESSOAS = [
  { email: 'ana.souza@77xp.com.br', nome: 'Ana Souza', tipo: 'TEAM', ativar: false },
  { email: 'bruno.lima@77xp.com.br', nome: 'Bruno Lima', tipo: 'ADMIN', ativar: true },
  { email: 'carla@empresacliente.com.br', nome: 'Carla Menezes', tipo: 'CLIENT', ativar: true, bloquear: true },
  { email: 'diego@outraempresa.com.br', nome: 'Diego Ferraz', tipo: 'CLIENT', ativar: false },
]

async function main() {
  await garantirDono()
  const token = await entrarComoDono()

  for (const pessoa of PESSOAS) {
    const convite = await post(
      '/admin/users/invitations',
      { email: pessoa.email, name: pessoa.nome, role: pessoa.tipo },
      token,
    )
    if (convite.status === 409) {
      console.log(`${pessoa.email}: já existe, pulando.`)
      continue
    }
    if (!convite.ok) {
      throw new Error(`Convite de ${pessoa.email} falhou: ${convite.status}`)
    }
    const criado = (await convite.json()).data
    console.log(`${pessoa.email}: convidado (${pessoa.tipo}).`)

    if (pessoa.ativar) {
      const link = await esperarLink(pessoa.email)
      const senha = `exemplo-${pessoa.tipo.toLowerCase()}-77xp`
      const ok = await post('/auth/first-access', { token: tokenDoLink(link), password: senha })
      if (!ok.ok) {
        throw new Error(`Primeiro acesso de ${pessoa.email} falhou: ${ok.status}`)
      }
      // Entrar uma vez para a lista ter "último acesso" em vez de "nunca entrou".
      await post('/auth/login', { email: pessoa.email, password: senha })
      console.log(`${pessoa.email}: senha criada e primeiro acesso feito.`)
    }

    if (pessoa.bloquear === true) {
      const ok = await post(`/admin/users/${criado.id}/block`, undefined, token)
      if (!ok.ok) {
        throw new Error(`Bloqueio de ${pessoa.email} falhou: ${ok.status}`)
      }
      console.log(`${pessoa.email}: bloqueada.`)
    }
  }

  console.log('Pronto. A lista agora tem as três situações.')
}

await main()
