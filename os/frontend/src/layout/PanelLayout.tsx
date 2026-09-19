import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

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
          `block rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive
              ? 'bg-primary/15 font-medium text-foreground'
              : 'text-text-secondary hover:bg-white/5 hover:text-foreground'
          }`
        }
      >
        {item.label}
      </NavLink>
    ))

  return (
    <div className="min-h-dvh md:flex">
      {/* Computador: menu sempre visível. */}
      <aside className="hidden w-60 shrink-0 border-r border-white/8 p-4 md:block">
        <Brand title={title} />
        <nav aria-label="Seções" className="mt-6 flex flex-col gap-1">
          {links()}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: barra de topo com o botão do menu. */}
        <header className="flex items-center gap-3 border-b border-white/8 p-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-do-painel"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="rounded-lg p-2 text-foreground hover:bg-white/5"
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          </button>
          <Brand title={title} />
        </header>

        {menuOpen ? (
          <nav
            id="menu-do-painel"
            aria-label="Seções"
            className="flex flex-col gap-1 border-b border-white/8 p-4 md:hidden"
          >
            {links(() => setMenuOpen(false))}
          </nav>
        ) : null}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          {userName ? (
            <p className="mb-6 text-sm text-text-secondary">
              Olá, <span className="text-foreground">{userName}</span>
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}

function Brand({ title }: { title: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-semibold text-foreground">77xp</span>
      <span className="text-sm text-text-tertiary">{title}</span>
    </div>
  )
}
