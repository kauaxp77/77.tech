package com.xp77.os.security;

import java.util.UUID;

/**
 * Identidade extraída do access token, injetada por {@code @AuthenticationPrincipal}.
 * Pessoa e organização vêm sempre do token, nunca do corpo ou da URL.
 */
public record AuthenticatedUser(UUID userId, UUID orgId, String email, String role) {

    /** Autoridade do Spring Security: ROLE_OWNER, ROLE_ADMIN ou ROLE_TEAM. */
    public String authority() {
        return "ROLE_" + role;
    }
}
