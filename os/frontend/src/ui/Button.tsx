import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const styles: Record<Variant, string> = {
  // O mesmo brilho roxo dos botões da landing.
  primary:
    'bg-primary text-white shadow-[0_0_15px_rgba(124,77,255,0.4)] hover:bg-secondary hover:shadow-[0_0_25px_rgba(124,77,255,0.55)]',
  secondary:
    'glass text-foreground hover:border-primary/50 hover:bg-white/8 hover:shadow-[var(--shadow-glow-soft)]',
  ghost: 'text-text-secondary hover:bg-white/8 hover:text-foreground',
  danger: 'bg-danger/12 text-danger hover:bg-danger/20',
}

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /** Enquanto envia: o botão trava sozinho, para não mandar duas vezes. */
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled === true || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50
        disabled:shadow-none ${sizes[size]} ${styles[variant]} ${rest.className ?? ''}`}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
          Aguarde…
        </>
      ) : (
        children
      )}
    </button>
  )
}
