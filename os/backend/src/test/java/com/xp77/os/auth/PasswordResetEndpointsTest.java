package com.xp77.os.auth;

import com.xp77.os.auth.api.FirstAccessTokens;
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
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PasswordResetEndpointsTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FirstAccessTokens firstAccess;

    private void forgot(String email) throws Exception {
        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isNoContent());
    }

    private String lastResetTokenSentTo(String email) {
        return ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'REDEFINIR_SENHA' order by created_at desc limit 1",
                String.class, email);
    }

    private ResultActions setPassword(String route, String token, String password) throws Exception {
        return mockMvc.perform(post(route).contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void forgotPasswordAnswersTheSameForKnownAndUnknownEmails() throws Exception {
        String known = TestData.uniqueEmail("existe");
        TestAuth.rootMember(known, "TEAM");
        String unknown = TestData.uniqueEmail("nao-existe");

        forgot(known);
        forgot(unknown);

        assertThat(ownerJdbc().queryForObject("select count(*) from email_outbox where to_address = ? "
                + "and template = 'REDEFINIR_SENHA'", Long.class, known)).isEqualTo(1L);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where to_address = ?", Long.class, unknown)).isZero();
    }

    @Test
    void theResetLinkFromTheEmailSetsTheNewPasswordAndEndsEverySession() throws Exception {
        String email = TestData.uniqueEmail("esqueci");
        TestAuth.rootMember(email, "TEAM");
        Cookie session = TestAuth.refreshCookie(mockMvc, email);

        forgot(email);
        setPassword("/auth/reset-password", lastResetTokenSentTo(email), "senha-nova-456")
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, "senha-nova-456").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void aLinkWorksOnlyOnce() throws Exception {
        String email = TestData.uniqueEmail("uma-vez");
        TestAuth.rootMember(email, "TEAM");
        forgot(email);
        String token = lastResetTokenSentTo(email);

        setPassword("/auth/reset-password", token, "primeira-vez-123").andExpect(status().isNoContent());
        setPassword("/auth/reset-password", token, "segunda-vez-123")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("CLIENT_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Link inválido ou expirado"));
    }

    @Test
    void anExpiredLinkIsRefused() throws Exception {
        String email = TestData.uniqueEmail("expirado");
        UUID user = TestAuth.rootMember(email, "TEAM");
        forgot(email);
        ownerJdbc().update("update password_reset_tokens set expires_at = now() - interval '1 minute' "
                + "where user_id = ?", user);

        setPassword("/auth/reset-password", lastResetTokenSentTo(email), "senha-nova-456")
                .andExpect(status().isBadRequest());
    }

    @Test
    void eachRouteAcceptsOnlyItsOwnKindOfLink() throws Exception {
        String email = TestData.uniqueEmail("pendente");
        UUID user = TestData.createUser(email, null);
        TestData.addMembership(user, RootOrganization.ID, "CLIENT");
        String firstAccessToken = firstAccess.issueFor(user).token();
        forgot(email);
        String resetToken = lastResetTokenSentTo(email);

        setPassword("/auth/reset-password", firstAccessToken, "senha-forte-123").andExpect(status().isBadRequest());
        setPassword("/auth/first-access", resetToken, "senha-forte-123").andExpect(status().isBadRequest());
        setPassword("/auth/first-access", firstAccessToken, "senha-forte-123").andExpect(status().isNoContent());
        assertThat(TestAuth.login(mockMvc, email, "senha-forte-123").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void shortPasswordIsRejectedWith422() throws Exception {
        setPassword("/auth/first-access", "qualquer", "123")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fieldErrors[0].field").value("password"));
    }
}
