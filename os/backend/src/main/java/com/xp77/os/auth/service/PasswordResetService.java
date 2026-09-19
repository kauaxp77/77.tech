package com.xp77.os.auth.service;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.entity.PasswordResetToken;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.repository.PasswordResetTokenRepository;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class PasswordResetService implements FirstAccessTokens {

    public static final String INVALID_LINK = "Link inválido ou expirado";

    private final PasswordResetTokenRepository tokens;
    private final UserDirectory users;
    private final RefreshTokenService sessions;
    private final EmailService emails;
    private final AuditLogger audit;
    private final long firstAccessHours;
    private final long resetHours;

    public PasswordResetService(PasswordResetTokenRepository tokens,
                                UserDirectory users,
                                RefreshTokenService sessions,
                                EmailService emails,
                                AuditLogger audit,
                                @Value("${xp77.auth.first-access-token-hours}") long firstAccessHours,
                                @Value("${xp77.auth.reset-token-hours}") long resetHours) {
        this.tokens = tokens;
        this.users = users;
        this.sessions = sessions;
        this.emails = emails;
        this.audit = audit;
        this.firstAccessHours = firstAccessHours;
        this.resetHours = resetHours;
    }

    /**
     * Cria o link de redefinição e enfileira o e-mail na MESMA transação. Cada pedido gera
     * link novo (dedup pelo hash do token): pedir duas vezes manda dois links válidos.
     */
    @Transactional
    public void requestReset(UserAccount user) {
        String token = create(user.id(), TokenPurpose.RESET, resetHours);
        emails.enqueue(user.email(), EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", token, "validityHours", resetHours),
                "redefinir-senha:" + OpaqueTokens.sha256Hex(token));
    }

    @Override
    @Transactional
    public Issued issueFor(UUID userId) {
        tokens.invalidateUnused(userId, TokenPurpose.FIRST_ACCESS, Instant.now());
        return new Issued(create(userId, TokenPurpose.FIRST_ACCESS, firstAccessHours), firstAccessHours);
    }

    /** Define a senha pelo link. Todas as sessões da pessoa caem: quem redefine costuma estar reagindo a um problema. */
    @Transactional
    public void redeem(String value, TokenPurpose purpose, String newPassword) {
        if (value == null || value.isBlank()) {
            throw invalidLink();
        }
        PasswordResetToken token = tokens.findByTokenHash(OpaqueTokens.sha256Hex(value))
                .filter(found -> found.getPurpose() == purpose)
                .filter(PasswordResetToken::isValid)
                .orElseThrow(PasswordResetService::invalidLink);

        users.setPassword(token.getUserId(), newPassword);
        token.markUsed();
        tokens.saveAndFlush(token);
        sessions.revokeAll(token.getUserId());
        audit.recordWithActor(token.getUserId(), AuditLogger.Actions.PASSWORD_RESET, "User",
                token.getUserId().toString(),
                Map.of("via", purpose == TokenPurpose.FIRST_ACCESS ? "primeiro acesso" : "esqueci minha senha"));
    }

    private String create(UUID userId, TokenPurpose purpose, long hours) {
        String value = OpaqueTokens.newValue();
        tokens.saveAndFlush(new PasswordResetToken(userId, OpaqueTokens.sha256Hex(value), purpose,
                Instant.now().plus(Duration.ofHours(hours))));
        return value;
    }

    private static BusinessException invalidLink() {
        return new BusinessException(ErrorCode.CLIENT_ERROR, INVALID_LINK);
    }
}
