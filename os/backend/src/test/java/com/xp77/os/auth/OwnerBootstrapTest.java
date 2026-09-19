package com.xp77.os.auth;

import com.xp77.os.auth.service.OwnerBootstrapRunner;
import com.xp77.os.auth.service.OwnerBootstrapService;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class OwnerBootstrapTest extends PostgresTestBase {

    @Autowired
    private OwnerBootstrapService bootstrap;

    @Autowired
    private MockMvc mockMvc;

    private boolean ensure(String email) {
        return OrgContext.callAs(RootOrganization.ID, () -> bootstrap.ensureOwner(email));
    }

    private String roleInRoot(String email) {
        return ownerJdbc().queryForObject("select m.role from memberships m join users u on u.id = m.user_id "
                + "where u.email = ? and m.org_id = ?", String.class, email, RootOrganization.ID);
    }

    @Test
    void createsTheOwnerWithoutPasswordAndEnqueuesTheFirstAccessEmailOnlyOnce() {
        String email = TestData.uniqueEmail("dono");

        assertThat(ensure(email)).isTrue();
        assertThat(ensure(email)).isFalse();

        assertThat(ownerJdbc().queryForObject(
                "select password_hash from users where email = ?", String.class, email)).isNull();
        assertThat(roleInRoot(email)).isEqualTo("OWNER");
        assertThat(ownerJdbc().queryForObject("select count(*) from email_outbox where to_address = ? "
                + "and template = 'PRIMEIRO_ACESSO'", Long.class, email)).isEqualTo(1L);
    }

    @Test
    void theFirstAccessLinkLetsTheOwnerCreateThePasswordAndLogIn() throws Exception {
        String email = TestData.uniqueEmail("dono-senha");
        ensure(email);
        String token = ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'PRIMEIRO_ACESSO'", String.class, email);

        mockMvc.perform(post("/auth/first-access").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"password\":\"senha-do-dono-123\"}"))
                .andExpect(status().isNoContent());

        assertThat(TestAuth.login(mockMvc, email, "senha-do-dono-123").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void runnerDoesNothingWithoutAnEmail() {
        long before = ownerJdbc().queryForObject("select count(*) from users", Long.class);

        new OwnerBootstrapRunner(bootstrap, "  ").run(null);

        assertThat(ownerJdbc().queryForObject("select count(*) from users", Long.class)).isEqualTo(before);
    }

    @Test
    void runnerCreatesTheOwnerInTheRootOrganization() {
        String email = TestData.uniqueEmail("runner");

        new OwnerBootstrapRunner(bootstrap, email).run(null);

        assertThat(roleInRoot(email)).isEqualTo("OWNER");
    }
}
