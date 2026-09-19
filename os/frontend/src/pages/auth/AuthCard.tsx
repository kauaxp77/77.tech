import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Moldura das telas de senha: entrar, primeiro acesso, redefinir e esqueci. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 block text-center text-2xl font-semibold">
          77xp
        </Link>
        <div className="glass rounded-2xl p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-text-secondary">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  )
}
