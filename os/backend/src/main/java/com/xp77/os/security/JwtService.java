package com.xp77.os.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Access token JWT HS256 com sub, jti, email, org e roles. */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    static final String CLAIM_EMAIL = "email";
    static final String CLAIM_ORG = "org";
    static final String CLAIM_ROLES = "roles";

    private final SecretKey key;
    private final Duration lifetime;

    public JwtService(@Value("${xp77.auth.jwt-secret}") String secret,
                      @Value("${xp77.auth.access-token-minutes}") long accessTokenMinutes) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        // Falha rápido: sem segredo forte qualquer um forja token, e o sintoma só
        // apareceria em produção. Construtor de bean que falha = aplicação não sobe.
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET ausente ou com menos de 32 bytes; HS256 exige pelo menos isso.");
        }
        this.key = new SecretKeySpec(bytes, "HmacSHA256");
        this.lifetime = Duration.ofMinutes(accessTokenMinutes);
    }

    public String generate(UUID userId, UUID orgId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_ORG, orgId.toString())
                .claim(CLAIM_ROLES, List.of(role))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(lifetime)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Optional<AuthenticatedUser> validate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            List<?> roles = claims.get(CLAIM_ROLES, List.class);
            String org = claims.get(CLAIM_ORG, String.class);
            if (roles == null || roles.isEmpty() || org == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthenticatedUser(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(org),
                    claims.get(CLAIM_EMAIL, String.class),
                    String.valueOf(roles.get(0))));
        } catch (Exception e) {
            // Token inválido não é erro do servidor: não polui o log em ERROR.
            log.debug("Token recusado: {}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    public long lifetimeSeconds() {
        return lifetime.toSeconds();
    }
}
