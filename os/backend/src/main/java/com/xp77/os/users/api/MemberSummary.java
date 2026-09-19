package com.xp77.os.users.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma conta de acesso vista de dentro de uma organização.
 *
 * @param blocked             o vínculo está bloqueado nesta organização
 * @param awaitingFirstAccess a pessoa ainda não criou a senha
 * @param lastLoginAt         último login nesta organização (nulo se nunca entrou)
 */
public record MemberSummary(UUID userId, String email, String name, MembershipRole role,
                            boolean blocked, boolean awaitingFirstAccess, Instant lastLoginAt) {
}
