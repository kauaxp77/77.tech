package com.xp77.os.auth.dto;

import java.util.UUID;

/** Quem está logado e em qual organização, com o tipo de conta (OWNER, ADMIN, TEAM ou CLIENT). */
public record MeResponse(UUID id, String email, String name, UUID orgId, String role) {
}
