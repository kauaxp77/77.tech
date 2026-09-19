import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Aurora } from '../../ui/Aurora'
import { Logo } from '../../ui/Logo'

/** Moldura das telas de senha: entrar, primeiro acesso, redefinir e esqueci. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <>
      <Aurora />
      <main className="relative flex min-h-dvh items-center justify-center p-4">
        <div className="animate-rise w-full max-w-md">
          <Link
            to="/"
            className="mb-10 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo size="lg" />
          </Link>

          <div className="glass rounded-3xl p-7 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] md:p-9">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 mb-8 text-sm leading-relaxed text-text-secondary">{subtitle}</p>
            {children}
          </div>

          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}

          <p className="mt-10 text-center text-[11px] font-medium tracking-widest text-text-tertiary uppercase">
            Arquitetura &bull; Desenvolvimento &bull; Escalabilidade
          </p>
        </div>
      </main>
    </>
  )
}
