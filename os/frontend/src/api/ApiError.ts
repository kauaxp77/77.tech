export type FieldError = { field: string; message: string }

/**
 * Erro vindo da API, no envelope que o backend usa em toda resposta de erro:
 * { success: false, error: { code, message, status, fieldErrors } }.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fieldErrors: FieldError[]

  constructor(code: string, status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** Mensagem de um campo do formulário, quando a API disse qual campo falhou. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((item) => item.field === field)?.message
  }

  /** Texto para mostrar na tela. 429 ganha um texto próprio: a API não explica a espera. */
  get userMessage(): string {
    if (this.status === 429) {
      return 'Muitas tentativas. Tente de novo em um minuto.'
    }
    if (this.status >= 500) {
      return 'Tivemos um problema aqui. Tente de novo em instantes.'
    }
    return this.message
  }

  static offline(): ApiError {
    return new ApiError('NETWORK_ERROR', 0, 'Sem conexão com o servidor. Verifique sua internet.')
  }
}
