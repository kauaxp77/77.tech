package com.xp77.os.auth;

import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * MAX_ACTIVE_SESSIONS vem do ambiente e ninguém garante um valor sensato. Em 0 a conta do
 * limite pedia um item que não existia na lista e TODO login quebrava com erro 500.
 */
@TestPropertySource(properties = "xp77.auth.max-active-sessions=0")
class SessionLimitBoundsTest extends PostgresTestBase {

    @Autowired
    private RefreshTokenService sessions;

    @Test
    void zeroAllowedSessionsDoesNotBreakLoginAndKeepsOnlyTheNewest() {
        UUID user = TestData.createUser(TestData.uniqueEmail("limite-zero"), null);

        assertThatCode(() -> sessions.issue(user, RootOrganization.ID, Origin.UNKNOWN)).doesNotThrowAnyException();
        String second = sessions.issue(user, RootOrganization.ID, Origin.UNKNOWN);

        assertThat(sessions.rotate(second, Origin.UNKNOWN)).isPresent();
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from refresh_tokens where user_id = ? and revoked_at is null",
                Long.class, user)).isEqualTo(1L);
    }
}
