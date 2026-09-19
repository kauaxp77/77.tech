/** Enquanto o site descobre se existe sessão. role="status" para o leitor de tela avisar. */
export function Checking() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <span className="text-sm text-text-secondary">Carregando…</span>
    </div>
  )
}
