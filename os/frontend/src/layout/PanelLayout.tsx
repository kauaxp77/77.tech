import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Aurora } from '../ui/Aurora'
import { Logo } from '../ui/Logo'

export type MenuItem = { to: string; label: string }

type Props = {
  /** Só as seções que já existem. O painel cresce acrescentando itens aqui. */
  items: MenuItem[]
  title: string
  userName: string | null
  children: ReactNode
}

/**
 * Estrutura do painel e da Área do cliente: no computador, menu lateral fixo; no
 * celular, barra de topo com ☰ e o menu por cima da página. Os dois usam o mesmo
 * componente para não haver duas versões do menu para manter.
 */
export function PanelLayout({ items, title, userName, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Esc fecha o menu: quem abriu sem querer precisa de uma saída pelo teclado.
  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const links = (onNavigate?: () => void) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to.split('/').length <= 2}
        onClick={onNavigate}
        className={({ isActive }) =>
          `relative block rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
            isActive
              ? `bg-primary/12 font-medium text-foreground before:absolute before:top-1/2 before:left-0
                 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full
                 before:bg-primary before:content-['']`
              : 'text-text-secondary hover:bg-white/5 hover:text-foreground'
          }`
        }
      >
        {item.label}
      </NavLink>
    ))

  return (
    <>
      <Aurora />
      <div className="relative min-h-dvh md:flex">
        {/* Computador: menu sempre visível. */}
        <aside className="hidden w-64 shrink-0 border-r border-white/6 p-5 md:flex md:flex-col">
          <div className="flex items-baseline gap-2 px-1">
            <Logo />
            <span className="text-xs font-medium tracking-widest text-text-tertiary uppercase">
              {title}
            </span>
          </div>
          <nav aria-label="Seções" className="mt-8 flex flex-col gap-1">
            {links()}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Celular: barra de topo com o botão do menu. */}
          <header className="glass sticky top-0 z-20 flex items-center gap-3 border-x-0 border-t-0 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-do-painel"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-xl p-2 text-foreground transition-colors hover:bg-white/8"
            >
              <span aria-hidden="true" className="text-lg">
                {menuOpen ? '✕' : '☰'}
              </span>
            </button>
            <Logo size="sm" />
            <span className="text-xs font-medium tracking-widest text-text-tertiary uppercase">
              {title}
            </span>
          </header>

          {menuOpen ? (
            <nav
              id="menu-do-painel"
              aria-label="Seções"
              className="glass animate-rise flex flex-col gap-1 border-x-0 border-t-0 p-4 md:hidden"
            >
              {links(() => setMenuOpen(false))}
            </nav>
          ) : null}

          <main className="min-w-0 flex-1 p-5 md:p-10">
            <div className="mx-auto w-full max-w-5xl">
              {userName ? (
                <p className="mb-8 text-sm text-text-tertiary">
                  Olá, <span className="font-medium text-foreground">{userName}</span>
                </p>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
