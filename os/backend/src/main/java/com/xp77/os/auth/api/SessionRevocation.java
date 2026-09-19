package com.xp77.os.auth.api;

import java.util.UUID;

/**
 * Encerra na hora todas as sessões (refresh tokens) de uma pessoa, em todos os aparelhos.
 * O access token em uso continua valendo até expirar (no máximo 15 minutos).
 */
public interface SessionRevocation {

    void revokeAllSessions(UUID userId);
}
