// Ponte do ambiente local: dentro do container do site, "localhost:54321" precisa
// chegar no Supabase local (npx supabase start), que publica a porta no computador.
// Assim o mesmo endereço funciona no navegador e no servidor do Next.js.
import net from 'node:net'

const ALVO = { host: 'host.docker.internal', port: 54321 }

net.createServer((conexao) => {
    const supabase = net.connect(ALVO)
    const fechar = () => {
        conexao.destroy()
        supabase.destroy()
    }
    conexao.on('error', fechar)
    supabase.on('error', fechar)
    conexao.pipe(supabase).pipe(conexao)
}).listen(ALVO.port, '127.0.0.1', () => {
    console.log(`[ponte] localhost:${ALVO.port} -> ${ALVO.host}:${ALVO.port}`)
})
