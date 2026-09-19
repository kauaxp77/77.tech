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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-foreground
          placeholder:text-text-tertiary
          ${error ? 'border-danger' : 'border-white/10 focus:border-primary'}`}
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
