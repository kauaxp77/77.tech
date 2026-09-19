package com.xp77.os.accounts.dto;

import com.xp77.os.users.api.MembershipRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InvitationRequest(
        @NotBlank(message = "Informe o e-mail")
        @Email(message = "E-mail inválido")
        String email,

        @NotBlank(message = "Informe o nome")
        @Size(max = 120, message = "O nome pode ter até 120 caracteres")
        String name,

        @NotNull(message = "Informe o tipo de conta")
        MembershipRole role) {
}
