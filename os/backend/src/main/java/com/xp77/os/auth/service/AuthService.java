package com.xp77.os.auth.service;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.JwtService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Orquestra login, renovação, saída e troca de senha. Sem @Transactional aqui de
 * propósito: cada chamada aos diretórios e às sessões abre a própria transação, e a
 * renovação precisa trocar de organização (OrgContext.callAs) entre uma e outra.
 */
@Service
public class AuthService {

    /** Mensagem única para qualquer falha: diferenciar os casos enumeraria contas. */
    public static final String INVALID_CREDENTIALS = "E-mail ou senha inválidos.";
    public static final String INVALID_SESSION = "Sessão inválida ou expirada";

    public record IssuedTokens(String accessToken, String refreshToken, long expiresInSeconds) {
    }

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwt;
    private final AuditLogger audit;

    public AuthService(UserDirectory users, MembershipDirectory memberships,
                       RefreshTokenService refreshTokens, JwtService jwt, AuditLogger audit) {
        this.users = users;
        this.memberships = memberships;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
        this.audit = audit;
    }

    /** Organização = a do domínio da requisição (OrgContextFilter). */
    public IssuedTokens login(String email, String password, Origin origin) {
        UUID orgId = OrgContext.current()
                .orElseThrow(() -> new IllegalStateException("Login sem organização no contexto"));
        Optional<UserAccount> account = users.verifyCredentials(email, password);
        Optional<MembershipRole> role = account.flatMap(a -> memberships.activeRoleOf(a.id(), orgId));
        if (role.isEmpty()) {
            recordFailedLogin(email, account);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        UserAccount user = account.get();
        memberships.recordLogin(user.id(), orgId);
        String refresh = refreshTokens.issue(user.id(), orgId, origin);
        audit.recordWithActor(user.id(), AuditLogger.Actions.LOGIN, "User", user.id().toString(),
                Map.of("method", "password"));
        return new IssuedTokens(jwt.generate(user.id(), orgId, user.email(), role.get().name()),
                refresh, jwt.lifetimeSeconds());
    }

    /** O tipo de conta é relido na organização da sessão: vínculo bloqueado não renova. */
    public IssuedTokens refresh(String refreshValue, Origin origin) {
        Rotation rotation = refreshTokens.rotate(refreshValue, origin).orElseThrow(AuthService::invalidSession);
        Optional<MembershipRole> role = OrgContext.callAs(rotation.orgId(),
                () -> memberships.activeRoleOf(rotation.userId(), rotation.orgId()));
        if (role.isEmpty()) {
            refreshTokens.revoke(rotation.newValue());
            throw invalidSession();
        }
        return new IssuedTokens(jwt.generate(rotation.userId(), rotation.orgId(), rotation.email(), role.get().name()),
                rotation.newValue(), jwt.lifetimeSeconds());
    }

    public void logout(String refreshValue) {
        refreshTokens.revoke(refreshValue).ifPresent(owner ->
                audit.recordWithActor(owner, AuditLogger.Actions.LOGOUT, "User", owner.toString(), Map.of()));
    }

    /** A pessoa do token, se ainda estiver ativa e com vínculo ativo na organização do token. */
    public UserAccount currentAccount(AuthenticatedUser user) {
        if (memberships.activeRoleOf(user.userId(), user.orgId()).isEmpty()) {
            throw invalidSession();
        }
        return users.findActiveById(user.userId()).orElseThrow(AuthService::invalidSession);
    }

    /** O e-mail conferido vem do token, nunca do corpo. Todas as sessões caem depois. */
    public void changePassword(AuthenticatedUser user, String currentPassword, String newPassword) {
        users.verifyCredentials(user.email(), currentPassword)
                .filter(account -> account.id().equals(user.userId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "Senha atual incorreta."));
        users.setPassword(user.userId(), newPassword);
        refreshTokens.revokeAll(user.userId());
        audit.recordWithActor(user.userId(), AuditLogger.Actions.PASSWORD_CHANGED, "User",
                user.userId().toString(), Map.of("via", "troca de senha logado"));
    }

    /** Tentativa recusada também é rastro: a conta visada (se o e-mail existe) e o e-mail digitado. */
    private void recordFailedLogin(String email, Optional<UserAccount> account) {
        String typed = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        UUID target = account.map(UserAccount::id)
                .orElseGet(() -> users.findByEmail(typed).map(UserAccount::id).orElse(null));
        audit.recordResult(null, AuditLogger.Actions.LOGIN_FAILED, "User",
                target == null ? null : target.toString(), Map.of("email", typed), false);
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_SESSION);
    }
}
