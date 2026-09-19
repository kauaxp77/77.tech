/**
 * Fundo da landing trazido para as telas do sistema: a grade de 24px que some nas
 * bordas e duas orbes roxas desfocadas. Fica atrás de tudo e não recebe clique.
 */
export function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="grid-backdrop absolute inset-0" />
      <div
        className="absolute -top-32 left-1/4 h-96 w-96 animate-pulse rounded-full bg-primary opacity-20
          mix-blend-screen blur-[128px]"
      />
      <div
        className="absolute top-1/3 right-1/5 h-96 w-96 animate-pulse rounded-full bg-secondary
          opacity-15 mix-blend-screen blur-[128px]"
        style={{ animationDelay: '2s' }}
      />
    </div>
  )
}
