package com.xp77.os.users;

import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentitySchemaTest extends PostgresTestBase {

    @Test
    void emailIsTrimmedAndLowercasedOnWrite() {
        String local = TestData.unique("Alguem");
        UUID id = TestData.createUser("  " + local + "@Exemplo.COM ", null);

        assertThat(ownerJdbc().queryForObject("select email from users where id = ?", String.class, id))
                .isEqualTo(local.toLowerCase() + "@exemplo.com");
    }

    @Test
    void emailIsUniqueRegardlessOfCase() {
        String email = TestData.uniqueEmail("dup");
        TestData.createUser(email, null);

        assertThatThrownBy(() -> TestData.createUser(email.toUpperCase(), null))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void statusOnlyAcceptsActiveOrBlocked() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into users (email, status) values (?, 'DELETED')", TestData.uniqueEmail("status")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void membershipIsUniquePerUserAndOrganization() {
        UUID org = TestData.createOrg("Única");
        UUID user = TestData.createUser(TestData.uniqueEmail("membro"), null);
        TestData.addMembership(user, org, "TEAM");

        assertThatThrownBy(() -> TestData.addMembership(user, org, "ADMIN"))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void membershipRoleAcceptsTheFourAccountTypesAndNothingElse() {
        UUID org = TestData.createOrg("Papéis");
        for (String role : new String[] {"OWNER", "ADMIN", "TEAM", "CLIENT"}) {
            TestData.addMembership(TestData.createUser(TestData.uniqueEmail(role.toLowerCase()), null), org, role);
        }
        UUID user = TestData.createUser(TestData.uniqueEmail("papel"), null);

        assertThatThrownBy(() -> TestData.addMembership(user, org, "SUPERADMIN"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void membershipStartsActiveWithoutLastLoginAndStatusIsChecked() {
        UUID org = TestData.createOrg("Situação");
        UUID membership = TestData.addMembership(TestData.createUser(TestData.uniqueEmail("situacao"), null), org, "TEAM");

        assertThat(ownerJdbc().queryForMap("select status, last_login_at from memberships where id = ?", membership))
                .containsEntry("status", "ACTIVE").containsEntry("last_login_at", null);
        assertThatThrownBy(() -> ownerJdbc().update("update memberships set status = 'DELETED' where id = ?", membership))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void nameIsOptional() {
        UUID id = TestData.createUser(TestData.uniqueEmail("sem-nome"), null);
        ownerJdbc().update("update users set name = 'Maria Souza' where id = ?", id);

        assertThat(ownerJdbc().queryForObject("select name from users where id = ?", String.class, id))
                .isEqualTo("Maria Souza");
    }

    @Test
    void userMayBelongToSeveralOrganizations() {
        UUID user = TestData.createUser(TestData.uniqueEmail("varias"), null);
        TestData.addMembership(user, TestData.createOrg("Uma"), "OWNER");
        TestData.addMembership(user, TestData.createOrg("Outra"), "TEAM");

        assertThat(ownerJdbc().queryForObject(
                "select count(*) from memberships where user_id = ?", Long.class, user)).isEqualTo(2L);
    }
}
