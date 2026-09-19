import { DefinirSenha } from './DefinirSenha'

/** Link do "esqueci minha senha" (finalidade RESET, 1 hora). */
export function RedefinirSenha() {
  return (
    <DefinirSenha
      route="/auth/reset-password"
      title="Redefinir a senha"
      subtitle="Escolha uma senha nova. Todas as suas sessões abertas serão encerradas."
      submitLabel="Salvar nova senha"
    />
  )
}
