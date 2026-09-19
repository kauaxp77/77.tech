package com.xp77.os.auth.api;

import java.util.UUID;

/**
 * Encerra sessões (refresh tokens) de uma pessoa. O access token em uso continua valendo
 * até expirar (no máximo 15 minutos).
 */
public interface SessionRevocation {

    /** Em todos os aparelhos e em todas as organizações. Para quando a senha muda. */
    void revokeAllSessions(UUID userId);

    /**
     * Só as sessões nascidas nesta organização. É o alcance de bloquear um vínculo: a
     * mesma pessoa pode ter conta em outra organização, e ela não é afetada.
     */
    void revokeSessionsInOrganization(UUID userId, UUID orgId);
}
