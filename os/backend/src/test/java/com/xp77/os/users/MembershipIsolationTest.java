package com.xp77.os.users;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.repository.MembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A prova do RLS: com a organização A no contexto, nada da organização B é lido,
 * alterado ou apagado — nem por repositório, nem por SQL direto — e nada é gravado em B.
 * A aplicação conecta como app_77xp; o preparo usa o dono (ownerJdbc).
 */
class MembershipIsolationTest extends PostgresTestBase {

    @Autowired
    private MembershipRepository memberships;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID orgA;
    private UUID orgB;
    private UUID userA;
    private UUID membershipA;
    private UUID membershipB;

    @BeforeEach
    void twoOrganizationsWithData() {
        OrgContext.clear();
        orgA = TestData.createOrg("Org A");
        orgB = TestData.createOrg("Org B");
        userA = TestData.createUser(TestData.uniqueEmail("a"), null);
        UUID userB = TestData.createUser(TestData.uniqueEmail("b"), null);
        membershipA = TestData.addMembership(userA, orgA, "OWNER");
        membershipB = TestData.addMembership(userB, orgB, "OWNER");
    }

    private <T> T inTransaction(TransactionCallback<T> action) {
        return new TransactionTemplate(transactionManager).execute(action);
    }

    @Test
    void repositoryReadsOnlyTheCurrentOrganization() {
        List<Membership> seen = OrgContext.callAs(orgA, () -> memberships.findAll());

        assertThat(seen).extracting(Membership::getOrgId).containsOnly(orgA);
        assertThat(seen).extracting(Membership::getId).contains(membershipA).doesNotContain(membershipB);
        assertThat(OrgContext.callAs(orgA, () -> memberships.findById(membershipB))).isEmpty();
    }

    @Test
    void nativeQueryReadsOnlyTheCurrentOrganization() {
        Long fromB = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.queryForObject(
                "select count(*) from memberships where org_id = ?", Long.class, orgB)));
        Long fromA = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.queryForObject(
                "select count(*) from memberships where org_id = ?", Long.class, orgA)));

        assertThat(fromB).isZero();
        assertThat(fromA).isEqualTo(1L);
    }

    @Test
    void cannotUpdateAnotherOrganizationsRow() {
        Integer updated = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.update(
                "update memberships set role = 'TEAM' where id = ?", membershipB)));

        assertThat(updated).isZero();
        assertThat(ownerJdbc().queryForObject(
                "select role from memberships where id = ?", String.class, membershipB)).isEqualTo("OWNER");
    }

    @Test
    void cannotDeleteAnotherOrganizationsRow() {
        OrgContext.runAs(orgA, () -> memberships.deleteById(membershipB));
        Integer deleted = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.update(
                "delete from memberships where id = ?", membershipB)));

        assertThat(deleted).isZero();
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from memberships where id = ?", Long.class, membershipB)).isEqualTo(1L);
    }

    @Test
    void cannotInsertARowForAnotherOrganization() {
        assertThatThrownBy(() -> OrgContext.runAs(orgA, () ->
                memberships.saveAndFlush(new Membership(userA, orgB, MembershipRole.TEAM))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("row-level security");
    }

    @Test
    void withoutOrganizationNothingIsVisible() {
        // A contagem sai para uma variável tipada: dentro de assertThat(...) o
        // genérico de inTransaction deixa a sobrecarga de assertThat ambígua.
        Long visible = inTransaction(status ->
                jdbc.queryForObject("select count(*) from memberships", Long.class));

        assertThat(memberships.findAll()).isEmpty();
        assertThat(visible).isZero();
    }
}
