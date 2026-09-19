import { Link } from 'react-router'
import { Aurora } from '../../ui/Aurora'
import { Logo } from '../../ui/Logo'

/**
 * Porta de entrada do sistema, não página de vendas: a página de vendas é o site
 * 77xp.tech, e uma segunda cópia dela aqui divergiria da verdadeira no primeiro
 * ajuste. Quem cai aqui procurando a empresa tem o caminho para lá, logo abaixo.
 */
export function Home() {
  return (
    <>
      <Aurora />
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
        <div className="animate-rise flex w-full max-w-md flex-col items-center text-center">
          <Logo size="lg" />

          <h1 className="mt-8 text-3xl font-bold text-balance text-foreground sm:text-4xl">
            O sistema da <span className="text-gradient">77xp Tech</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Propostas, clientes e projetos num lugar só.
          </p>

          {/* Mesmas classes da variante primária do Button: é o mesmo botão, só que
              é um link de verdade, com href, para funcionar sem o JavaScript. */}
          <Link
            to="/entrar"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-primary
              px-8 text-sm font-medium text-white shadow-[0_0_15px_rgba(124,77,255,0.4)]
              transition-all duration-200 hover:bg-secondary
              hover:shadow-[0_0_25px_rgba(124,77,255,0.55)]"
          >
            Entrar
          </Link>

          <p className="mt-12 text-sm text-text-tertiary">
            Procurando a 77xp?{' '}
            <a
              href="https://77xp.tech"
              className="text-text-secondary underline underline-offset-4
                transition-colors hover:text-foreground"
            >
              77xp.tech
            </a>
          </p>
        </div>
      </main>
    </>
  )
}
