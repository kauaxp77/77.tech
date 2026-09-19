package com.xp77.os.security;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "segredo-de-teste-com-mais-de-32-bytes-para-hs256";

    private final JwtService jwt = new JwtService(SECRET, 15);

    @Test
    void validTokenCarriesUserOrganizationEmailAndRole() {
        UUID user = UUID.randomUUID();
        UUID org = UUID.randomUUID();

        AuthenticatedUser authenticated = jwt.validate(jwt.generate(user, org, "dono@exemplo.com", "OWNER"))
                .orElseThrow();

        assertThat(authenticated.userId()).isEqualTo(user);
        assertThat(authenticated.orgId()).isEqualTo(org);
        assertThat(authenticated.email()).isEqualTo("dono@exemplo.com");
        assertThat(authenticated.role()).isEqualTo("OWNER");
        assertThat(authenticated.authority()).isEqualTo("ROLE_OWNER");
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String forged = new JwtService("outro-segredo-totalmente-diferente-com-32b", 15)
                .generate(UUID.randomUUID(), UUID.randomUUID(), "invasor@exemplo.com", "OWNER");

        assertThat(jwt.validate(forged)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        String expired = new JwtService(SECRET, -1)
                .generate(UUID.randomUUID(), UUID.randomUUID(), "a@exemplo.com", "TEAM");

        assertThat(jwt.validate(expired)).isEmpty();
    }

    @Test
    void garbageIsRejectedWithoutThrowing() {
        assertThat(jwt.validate("isto-nao-e-um-jwt")).isEmpty();
        assertThat(jwt.validate("")).isEmpty();
        assertThat(jwt.validate(null)).isEmpty();
    }

    @Test
    void twoTokensForTheSameUserHaveDistinctIds() {
        UUID user = UUID.randomUUID();
        UUID org = UUID.randomUUID();

        assertThat(jwt.generate(user, org, "a@b.com", "TEAM")).isNotEqualTo(jwt.generate(user, org, "a@b.com", "TEAM"));
    }

    @Test
    void lifetimeIsExposedInSeconds() {
        assertThat(jwt.lifetimeSeconds()).isEqualTo(900L);
    }

    @Test
    void secretShorterThan32BytesPreventsStartup() {
        assertThatThrownBy(() -> new JwtService("curto-demais", 15))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
        assertThatThrownBy(() -> new JwtService(null, 15)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tokensAreSignedWithHs256() {
        String token = jwt.generate(UUID.randomUUID(), UUID.randomUUID(), "a@b.com", "ADMIN");
        String header = new String(Base64.getUrlDecoder().decode(token.split("\\.")[0]), StandardCharsets.UTF_8);

        assertThat(header).contains("\"alg\":\"HS256\"");
    }

    @Test
    void tokenWithoutOrganizationOrRoleIsRejected() {
        SecretKeySpec key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Date inOneMinute = Date.from(Instant.now().plusSeconds(60));
        String withoutRole = Jwts.builder().subject(UUID.randomUUID().toString())
                .claim("org", UUID.randomUUID().toString()).claim("email", "a@b.com")
                .expiration(inOneMinute).signWith(key, Jwts.SIG.HS256).compact();
        String withoutOrg = Jwts.builder().subject(UUID.randomUUID().toString())
                .claim("roles", java.util.List.of("OWNER")).claim("email", "a@b.com")
                .expiration(inOneMinute).signWith(key, Jwts.SIG.HS256).compact();

        assertThat(jwt.validate(withoutRole)).isEmpty();
        assertThat(jwt.validate(withoutOrg)).isEmpty();
    }
}
