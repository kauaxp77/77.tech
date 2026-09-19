package com.xp77.os.auth;

import com.xp77.os.auth.entity.RefreshToken;
import com.xp77.os.auth.repository.RefreshTokenRepository;
import com.xp77.os.auth.service.OpaqueTokens;
import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenServiceTest extends PostgresTestBase {

    @Autowired
    private RefreshTokenService sessions;

    @Autowired
    private RefreshTokenRepository repository;

    private UUID newUser() {
        return TestData.createUser(TestData.uniqueEmail("sessao"), null);
    }

    private String issue(UUID user) {
        return sessions.issue(user, RootOrganization.ID, Origin.UNKNOWN);
    }

    private RefreshToken stored(String value) {
        return repository.findByTokenHash(OpaqueTokens.sha256Hex(value)).orElseThrow();
    }

    @Test
    void onlyTheHashIsStored() {
        String value = issue(newUser());

        assertThat(value).hasSize(43);
        assertThat(repository.findByTokenHash(value)).isEmpty();
        assertThat(repository.findByTokenHash(OpaqueTokens.sha256Hex(value))).isPresent();
    }

    @Test
    void rotationKeepsUserOrganizationAndFamilyAndLinksTheSuccessor() {
        UUID user = newUser();
        String first = issue(user);

        Rotation rotation = sessions.rotate(first, Origin.UNKNOWN).orElseThrow();

        assertThat(rotation.userId()).isEqualTo(user);
        assertThat(rotation.orgId()).isEqualTo(RootOrganization.ID);
        assertThat(rotation.email()).endsWith("@teste.77xp.dev");
        assertThat(rotation.newValue()).isNotEqualTo(first);
        RefreshToken old = stored(first);
        RefreshToken successor = stored(rotation.newValue());
        assertThat(old.getReplacedBy()).isEqualTo(successor.getId());
        assertThat(old.getRevokedAt()).isNotNull();
        assertThat(successor.getFamilyId()).isEqualTo(old.getFamilyId());
    }

    @Test
    void reusingARotatedTokenRevokesEverySessionOfTheUser() {
        UUID user = newUser();
        String t1 = issue(user);
        String t2 = sessions.rotate(t1, Origin.UNKNOWN).orElseThrow().newValue();
        String t3 = sessions.rotate(t2, Origin.UNKNOWN).orElseThrow().newValue();
        String otherDevice = issue(user);

        // t1 reapareceu: alguém tem uma cópia. Tudo do usuário cai, inclusive o que valia.
        assertThat(sessions.rotate(t1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(t3, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(otherDevice, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void unknownBlankOrNullTokensAreRejectedWithoutThrowing() {
        assertThat(sessions.rotate("valor-que-nunca-existiu", Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate("", Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(null, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void blockedUserCannotRotate() {
        UUID user = newUser();
        String value = issue(user);
        ownerJdbc().update("update users set status = 'BLOCKED' where id = ?", user);

        assertThat(sessions.rotate(value, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        String value = issue(newUser());
        ownerJdbc().update("update refresh_tokens set expires_at = now() - interval '1 minute' where token_hash = ?",
                OpaqueTokens.sha256Hex(value));

        assertThat(sessions.rotate(value, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void revokeEndsOnlyThatSessionAndReturnsItsOwner() {
        UUID user = newUser();
        String tab1 = issue(user);
        String tab2 = issue(user);

        assertThat(sessions.revoke(tab1)).contains(user);
        assertThat(sessions.rotate(tab1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(tab2, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.revoke("desconhecido")).isEmpty();
    }

    @Test
    void revokeAllEndsEverySessionOfOnlyThatUser() {
        UUID a = newUser();
        UUID b = newUser();
        String a1 = issue(a);
        String a2 = issue(a);
        String b1 = issue(b);

        sessions.revokeAll(a);

        assertThat(sessions.rotate(a1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(a2, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(b1, Origin.UNKNOWN)).map(Rotation::userId).contains(b);
    }

    @Test
    void aNewDeviceBeyondTheLimitEndsTheOldestSession() {
        UUID user = newUser();
        String s1 = issue(user);
        String s2 = issue(user);
        String s3 = issue(user);
        String s4 = issue(user);

        assertThat(sessions.rotate(s1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(s2, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.rotate(s3, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.rotate(s4, Origin.UNKNOWN)).isPresent();
    }

    @Test
    void sessionRecordsWhereItCameFrom() {
        UUID user = newUser();
        String value = sessions.issue(user, RootOrganization.ID, new Origin("203.0.113.9", "Navegador/" + "x".repeat(500)));

        assertThat(stored(value).getIp()).isEqualTo("203.0.113.9");
        assertThat(stored(value).getUserAgent()).hasSize(400);

        String next = sessions.rotate(value, new Origin("198.51.100.4", "Outro aparelho")).orElseThrow().newValue();
        assertThat(stored(next).getIp()).isEqualTo("198.51.100.4");
        assertThat(stored(next).getUserAgent()).isEqualTo("Outro aparelho");
    }
}
