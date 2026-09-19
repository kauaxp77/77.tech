package com.xp77.os.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A senha atual é exigida mesmo com sessão válida: sessão aberta prova que a pessoa
 * entrou em algum momento, não que é ela quem está no teclado agora.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "Informe sua senha atual")
        String currentPassword,

        @NotBlank(message = "Informe a nova senha")
        @Size(min = 8, message = "A nova senha precisa ter ao menos 8 caracteres")
        String newPassword) {
}
