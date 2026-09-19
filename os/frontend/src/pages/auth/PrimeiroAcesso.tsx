import { DefinirSenha } from './DefinirSenha'

/** Link do convite e do dono inicial (finalidade FIRST_ACCESS, 72 horas). */
export function PrimeiroAcesso() {
  return (
    <DefinirSenha
      route="/auth/first-access"
      title="Criar sua senha"
      subtitle="Escolha a senha que você vai usar para entrar na 77xp."
      submitLabel="Criar senha"
    />
  )
}
