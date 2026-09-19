package com.xp77.os.auth.service;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.entity.RefreshToken;
import com.xp77.os.auth.repository.RefreshTokenRepository;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    /** De onde a sessão nasceu (IP confiável e aparelho). */
    public record Origin(String ip, String userAgent) {
        public static final Origin UNKNOWN = new Origin(null, null);
    }

    public record Rotation(UUID userId, UUID orgId, String email, String newValue) {
    }

    private final RefreshTokenRepository tokens;
    private final UserDirectory users;
    private final AuditLogger audit;
    private final Duration lifetime;
    private final int maxActiveSessions;

    public RefreshTokenService(RefreshTokenRepository tokens,
                               UserDirectory users,
                               AuditLogger audit,
                               @Value("${xp77.auth.refresh-token-days}") long days,
                               @Value("${xp77.auth.max-active-sessions}") int maxActiveSessions) {
        this.tokens = tokens;
        this.users = users;
        this.audit = audit;
        this.lifetime = Duration.ofDays(days);
        this.maxActiveSessions = maxActiveSessions;
    }

    /**
     * Abre uma sessão nova (um aparelho). Acima do limite, a mais antiga cai antes de
     * gravar a nova: derrubar é melhor que recusar quem trocou de aparelho.
     */
    @Transactional
    public String issue(UUID userId, UUID orgId, Origin origin) {
        enforceSessionLimit(userId);
        String value = OpaqueTokens.newValue();
        tokens.saveAndFlush(new RefreshToken(userId, orgId, UUID.randomUUID(),
                OpaqueTokens.sha256Hex(value), Instant.now().plus(lifetime), origin.ip(), origin.userAgent()));
        return value;
    }

    /**
     * Troca um refresh token por outro. Vazio quando o token é desconhecido, expirado,
     * revogado ou de pessoa bloqueada — ou quando já foi trocado antes: nesse caso é
     * cópia, e todas as sessões da pessoa caem.
     */
    @Transactional
    public Optional<Rotation> rotate(String value, Origin origin) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        Optional<RefreshToken> found = tokens.lockByTokenHash(OpaqueTokens.sha256Hex(value));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        RefreshToken current = found.get();

        if (current.wasRotated()) {
            log.warn("Reuso de refresh token detectado para o usuário {}; todas as sessões foram revogadas",
                    current.getUserId());
            tokens.revokeAllActive(current.getUserId(), Instant.now());
            audit.recordResult(current.getUserId(), AuditLogger.Actions.SESSION_REUSE_DETECTED, "User",
                    current.getUserId().toString(), Map.of("family", current.getFamilyId().toString()), false);
            return Optional.empty();
        }
        if (!current.isActive()) {
            return Optional.empty();
        }
        Optional<UserAccount> owner = users.findActiveById(current.getUserId());
        if (owner.isEmpty()) {
            return Optional.empty();
        }

        String newValue = OpaqueTokens.newValue();
        RefreshToken successor = tokens.saveAndFlush(new RefreshToken(current.getUserId(), current.getOrgId(),
                current.getFamilyId(), OpaqueTokens.sha256Hex(newValue), Instant.now().plus(lifetime),
                origin.ip(), origin.userAgent()));
        current.revoke();
        current.markReplacedBy(successor.getId());
        tokens.saveAndFlush(current);

        return Optional.of(new Rotation(current.getUserId(), current.getOrgId(), owner.get().email(), newValue));
    }

    /** Encerra uma sessão (sair). Devolve o dono, quando o token existe. */
    @Transactional
    public Optional<UUID> revoke(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        return tokens.lockByTokenHash(OpaqueTokens.sha256Hex(value)).map(token -> {
            token.revoke();
            tokens.saveAndFlush(token);
            return token.getUserId();
        });
    }

    @Transactional
    public void revokeAll(UUID userId) {
        tokens.revokeAllActive(userId, Instant.now());
    }

    /**
     * Encerra só as sessões que nasceram nesta organização. A mesma pessoa pode ter conta
     * em duas; quem administra uma não derruba a sessão dela na outra.
     */
    @Transactional
    public void revokeAllInOrganization(UUID userId, UUID orgId) {
        tokens.revokeActiveInOrganization(userId, orgId, Instant.now());
    }

    private void enforceSessionLimit(UUID userId) {
        List<RefreshToken> active = tokens.findActiveByUser(userId);
        // Nunca além do tamanho da lista: MAX_ACTIVE_SESSIONS vem do ambiente e, em 0
        // ou 1, a conta simples pediria um índice que não existe e derrubaria o login.
        int excess = Math.min(active.size(), active.size() - (maxActiveSessions - 1));
        for (int i = 0; i < excess; i++) {
            RefreshToken oldest = active.get(i);
            oldest.revoke();
            tokens.save(oldest);
            log.info("Sessão mais antiga do usuário {} encerrada pelo limite de {} sessões.", userId, maxActiveSessions);
        }
    }
}
