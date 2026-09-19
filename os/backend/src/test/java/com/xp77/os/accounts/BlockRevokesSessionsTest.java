package com.xp77.os.accounts;

import com.xp77.os.accounts.service.AccountsService;
import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Bloquear derruba na hora todas as sessões da pessoa (os refresh tokens de todos os aparelhos). */
class BlockRevokesSessionsTest extends PostgresTestBase {

    @Autowired
    private AccountsService accounts;

    @Autowired
    private RefreshTokenService sessions;

    /**
     * O bloqueio vale por organização: a mesma pessoa pode ser cliente de duas, e quem
     * administra uma não tem nada a ver com a outra. Só as sessões nascidas ali caem.
     */
    @Test
    void blockingInOneOrganizationLeavesTheSessionsOfAnotherAlone() {
        UUID owner = TestAuth.rootMember(TestData.uniqueEmail("dono-duas-orgs"), "OWNER");
        UUID member = TestAuth.rootMember(TestData.uniqueEmail("nas-duas"), "TEAM");
        UUID otherOrg = TestData.createOrg("Organização vizinha");
        TestData.addMembership(member, otherOrg, "CLIENT");
        String hereSession = sessions.issue(member, RootOrganization.ID, Origin.UNKNOWN);
        String thereSession = sessions.issue(member, otherOrg, Origin.UNKNOWN);
        AuthenticatedUser actor = new AuthenticatedUser(owner, RootOrganization.ID, "dono@exemplo.com", "OWNER");

        OrgContext.runAs(RootOrganization.ID, () -> accounts.block(actor, member));

        assertThat(sessions.rotate(hereSession, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(thereSession, Origin.UNKNOWN)).isPresent();
    }

    @Test
    void blockingEndsEverySessionOfThePersonAtOnce() {
        UUID owner = TestAuth.rootMember(TestData.uniqueEmail("dono-bloqueio"), "OWNER");
        UUID member = TestAuth.rootMember(TestData.uniqueEmail("bloqueada"), "TEAM");
        String laptop = sessions.issue(member, RootOrganization.ID, Origin.UNKNOWN);
        String phone = sessions.issue(member, RootOrganization.ID, Origin.UNKNOWN);
        AuthenticatedUser actor = new AuthenticatedUser(owner, RootOrganization.ID, "dono@exemplo.com", "OWNER");

        OrgContext.runAs(RootOrganization.ID, () -> accounts.block(actor, member));

        assertThat(sessions.rotate(laptop, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(phone, Origin.UNKNOWN)).isEmpty();
        assertThat(ownerJdbc().queryForObject("select status from memberships where user_id = ? and org_id = ?",
                String.class, member, RootOrganization.ID)).isEqualTo("BLOCKED");
    }
}
