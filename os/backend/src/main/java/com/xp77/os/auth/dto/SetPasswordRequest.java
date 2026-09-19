package com.xp77.os.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de /auth/reset-password e /auth/first-access: o token do link e a senha nova. */
public record SetPasswordRequest(
        @NotBlank(message = "Link inválido ou expirado")
        String token,

        @NotBlank(message = "Informe a senha")
        @Size(min = 8, message = "A senha precisa ter ao menos 8 caracteres")
        String password) {
}
