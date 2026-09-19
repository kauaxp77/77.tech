package com.xp77.os.auth;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Login, falha de login, saída, reuso de sessão e senha aparecem na auditoria. */
@AutoConfigureMockMvc
class AuthAuditTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    private List<Map<String, Object>> entries(String action, UUID user) {
        return ownerJdbc().queryForList("select result, org_id, actor_user_id, metadata::text as metadata "
                + "from audit_logs where action = ? and entity_id = ? order by created_at", action, user.toString());
    }

    @Test
    void successfulAndFailedLoginsAreRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-login");
        UUID user = TestAuth.rootMember(email, "TEAM");

        TestAuth.login(mockMvc, email, "senha-errada-1");
        TestAuth.login(mockMvc, email, TestAuth.PASSWORD);

        List<Map<String, Object>> failed = entries("LOGIN_FAILED", user);
        assertThat(failed).hasSize(1);
        assertThat(failed.get(0)).containsEntry("result", "FAILURE").containsEntry("org_id", RootOrganization.ID);
        assertThat((String) failed.get(0).get("metadata")).contains(email);
        assertThat(entries("LOGIN", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("result", "SUCCESS").containsEntry("actor_user_id", user));
    }

    @Test
    void logoutIsRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-sair");
        UUID user = TestAuth.rootMember(email, "TEAM");

        mockMvc.perform(post("/auth/logout").cookie(TestAuth.refreshCookie(mockMvc, email)))
                .andExpect(status().isNoContent());

        assertThat(entries("LOGOUT", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("actor_user_id", user));
    }

    @Test
    void refreshTokenReuseIsRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-reuso");
        UUID user = TestAuth.rootMember(email, "TEAM");
        Cookie first = TestAuth.refreshCookie(mockMvc, email);
        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isOk());

        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());

        assertThat(entries("SESSION_REUSE_DETECTED", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("result", "FAILURE"));
    }

    @Test
    void passwordChangeAndResetAreRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-senha");
        UUID user = TestAuth.rootMember(email, "ADMIN");
        mockMvc.perform(post("/auth/change-password")
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + TestAuth.PASSWORD + "\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isNoContent());
        String token = ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'REDEFINIR_SENHA'", String.class, email);
        MvcResult reset = mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"password\":\"outra-senha-789\"}"))
                .andReturn();

        assertThat(reset.getResponse().getStatus()).isEqualTo(204);
        assertThat(entries("PASSWORD_CHANGED", user)).hasSize(1);
        assertThat(entries("PASSWORD_RESET", user)).singleElement()
                .satisfies(entry -> assertThat((String) entry.get("metadata")).contains("esqueci minha senha"));
    }
}
