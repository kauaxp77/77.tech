import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Mensagem do campo vinda da API (fieldErrors) ou da própria tela. */
  error?: string | undefined
  hint?: string | undefined
}

/**
 * Rótulo ligado ao campo e erro ligado por aria-describedby: sem isso, quem usa
 * leitor de tela não ouve o que deu errado — e estas telas são de senha.
 */
export function Field({ label, error, hint, ...rest }: Props) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-ajuda`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`h-11 rounded-xl border bg-white/4 px-4 text-sm text-foreground
          transition-colors placeholder:text-text-tertiary
          ${
            error
              ? 'border-danger/60 focus:border-danger'
              : 'border-white/8 hover:border-white/15 focus:border-primary'
          }`}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
