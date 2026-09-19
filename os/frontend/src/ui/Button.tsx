import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-secondary',
  secondary: 'glass text-foreground hover:border-white/20',
  ghost: 'text-text-secondary hover:text-foreground hover:bg-white/5',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  /** Enquanto envia: o botão trava sozinho, para não mandar duas vezes. */
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', loading = false, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled === true || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm
        font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50
        ${styles[variant]} ${rest.className ?? ''}`}
    >
      {loading ? 'Aguarde…' : children}
    </button>
  )
}
