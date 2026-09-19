import type { ReactNode } from 'react'

/** Cartão de vidro com o brilho roxo no hover, como os cartões de Soluções da landing. */
export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`glass rounded-2xl p-6 transition-all duration-300 ${
        interactive ? 'hover:border-primary/40 hover:shadow-[var(--shadow-glow-soft)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      {/* Quadrado com o degradê da marca: um contorno vazio parecia ícone que não carregou. */}
      <div
        aria-hidden="true"
        className="mb-1 size-12 rounded-2xl border border-primary/30 bg-gradient-to-br
          from-primary/35 to-secondary/15 shadow-[var(--shadow-glow-soft)]"
      />
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>
    </Card>
  )
}

const tones = {
  neutral: 'bg-white/6 text-text-secondary ring-white/10',
  success: 'bg-success/12 text-success ring-success/20',
  warning: 'bg-warning/12 text-warning ring-warning/20',
  danger: 'bg-danger/12 text-danger ring-danger/20',
} as const

export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset
        ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Cabeçalho de página do painel: título grande com gradiente e uma linha de apoio. */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
    </header>
  )
}
