package com.xp77.os.users;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MembershipDirectoryServiceTest extends PostgresTestBase {

    @Autowired
    private MembershipDirectory memberships;

    private UUID member(UUID org, String role) {
        UUID user = TestData.createUser(TestData.uniqueEmail(role.toLowerCase()), null);
        TestData.addMembership(user, org, role);
        return user;
    }

    @Test
    void activeRoleOfReturnsTheRoleInsideItsOrganization() {
        UUID org = TestData.createOrg("Com papel");
        UUID user = member(org, "CLIENT");

        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).contains(MembershipRole.CLIENT);
    }

    @Test
    void activeRoleOfNeverSeesAnotherOrganizationsMembership() {
        UUID mine = TestData.createOrg("Minha");
        UUID other = TestData.createOrg("Outra");
        UUID user = member(other, "OWNER");

        assertThat(OrgContext.callAs(mine, () -> memberships.activeRoleOf(user, other))).isEmpty();
        assertThat(OrgContext.callAs(mine, () -> memberships.activeRoleOf(user, mine))).isEmpty();
    }

    @Test
    void blockedMembershipHasNoActiveRoleUntilUnblocked() {
        UUID org = TestData.createOrg("Bloqueio");
        UUID user = member(org, "TEAM");

        OrgContext.runAs(org, () -> memberships.block(user, org));
        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).isEmpty();
        assertThat(OrgContext.callAs(org, () -> memberships.findMember(user, org)))
                .map(MemberSummary::blocked).contains(true);

        OrgContext.runAs(org, () -> memberships.unblock(user, org));
        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).contains(MembershipRole.TEAM);
    }

    @Test
    void blockingAnUnknownMembershipIsNotFound() {
        UUID org = TestData.createOrg("Sem vínculo");

        assertThatThrownBy(() -> OrgContext.runAs(org, () -> memberships.block(UUID.randomUUID(), org)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void recordLoginStoresTheLastAccess() {
        UUID org = TestData.createOrg("Último acesso");
        UUID user = member(org, "ADMIN");

        OrgContext.runAs(org, () -> memberships.recordLogin(user, org));

        assertThat(OrgContext.callAs(org, () -> memberships.findMember(user, org)))
                .map(MemberSummary::lastLoginAt).isPresent();
    }

    @Test
    void listMembersReturnsOnlyThisOrganizationWithTheirData() {
        UUID org = TestData.createOrg("Lista");
        UUID other = TestData.createOrg("Vizinha");
        String email = TestData.uniqueEmail("aaa-lista");
        UUID named = TestData.createUser(email, TestData.hash("senha-forte-123"));
        ownerJdbc().update("update users set name = 'Ana Lima' where id = ?", named);
        TestData.addMembership(named, org, "CLIENT");
        UUID pending = member(org, "TEAM");
        member(other, "TEAM");

        List<MemberSummary> list = OrgContext.callAs(org, () -> memberships.listMembers(org));

        assertThat(list).extracting(MemberSummary::userId).containsExactlyInAnyOrder(named, pending);
        MemberSummary ana = list.stream().filter(m -> m.userId().equals(named)).findFirst().orElseThrow();
        assertThat(ana.email()).isEqualTo(email);
        assertThat(ana.name()).isEqualTo("Ana Lima");
        assertThat(ana.role()).isEqualTo(MembershipRole.CLIENT);
        assertThat(ana.awaitingFirstAccess()).isFalse();
        assertThat(list.stream().filter(m -> m.userId().equals(pending)).findFirst().orElseThrow()
                .awaitingFirstAccess()).isTrue();
    }

    @Test
    void grantIsIdempotentAndKeepsTheFirstRole() {
        UUID org = TestData.createOrg("Vínculo");
        UUID user = TestData.createUser(TestData.uniqueEmail("vinculo"), null);

        OrgContext.runAs(org, () -> memberships.grant(user, org, MembershipRole.ADMIN));
        OrgContext.runAs(org, () -> memberships.grant(user, org, MembershipRole.TEAM));

        assertThat(ownerJdbc().queryForList(
                "select role from memberships where user_id = ?", String.class, user)).containsExactly("ADMIN");
    }

    @Test
    void grantForAnotherOrganizationIsRefusedByTheDatabase() {
        UUID mine = TestData.createOrg("Contexto");
        UUID other = TestData.createOrg("Alvo");
        UUID user = TestData.createUser(TestData.uniqueEmail("intruso"), null);

        assertThatThrownBy(() -> OrgContext.runAs(mine, () -> memberships.grant(user, other, MembershipRole.TEAM)))
                .isInstanceOf(DataAccessException.class);
    }
}
