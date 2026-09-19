package com.xp77.os.auth;

import com.jayway.jsonpath.JsonPath;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthEndpointsTest extends PostgresTestBase {

    private static final String GENERIC = "E-mail ou senha inválidos.";

    @Autowired
    private MockMvc mockMvc;

    private String member(String prefix, String role) {
        String email = TestData.uniqueEmail(prefix);
        TestAuth.rootMember(email, role);
        return email;
    }

    private void blockMembership(String email) {
        ownerJdbc().update("update memberships set status = 'BLOCKED' where org_id = ? "
                + "and user_id = (select id from users where email = ?)", RootOrganization.ID, email);
    }

    private void expectGenericFailure(String email, String password) throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(TestAuth.loginBody(email, password)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.message").value(GENERIC));
    }

    @Test
    void validLoginReturnsAccessTokenInTheBodyAndRefreshOnlyInTheCookie() throws Exception {
        MvcResult result = TestAuth.login(mockMvc, member("ok", "OWNER"), TestAuth.PASSWORD);

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        String body = result.getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(body, "$.data.accessToken")).isNotBlank();
        assertThat(JsonPath.<Integer>read(body, "$.data.expiresIn")).isEqualTo(900);
        assertThat(JsonPath.<String>read(body, "$.data.tokenType")).isEqualTo("Bearer");
        Cookie cookie = result.getResponse().getCookie("xp_refresh");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(body).doesNotContain("refreshToken").doesNotContain(cookie.getValue());
    }

    @Test
    void wrongPasswordUnknownEmailAndNoMembershipGetTheSameAnswer() throws Exception {
        String email = member("errada", "TEAM");
        String outsider = TestData.uniqueEmail("sem-vinculo");
        TestData.createUser(outsider, TestData.hash(TestAuth.PASSWORD));

        expectGenericFailure(email, "outra-senha");
        expectGenericFailure(TestData.uniqueEmail("ninguem"), TestAuth.PASSWORD);
        expectGenericFailure(outsider, TestAuth.PASSWORD);
    }

    @Test
    void blockedPersonOrBlockedMembershipCannotLogIn() throws Exception {
        String blockedPerson = member("pessoa-bloqueada", "TEAM");
        ownerJdbc().update("update users set status = 'BLOCKED' where email = ?", blockedPerson);
        String blockedMembership = member("vinculo-bloqueado", "CLIENT");
        blockMembership(blockedMembership);

        expectGenericFailure(blockedPerson, TestAuth.PASSWORD);
        expectGenericFailure(blockedMembership, TestAuth.PASSWORD);
    }

    @Test
    void loginIgnoresEmailCaseAndRecordsTheLastAccess() throws Exception {
        String email = member("caixa", "ADMIN");

        assertThat(TestAuth.login(mockMvc, email.toUpperCase(), TestAuth.PASSWORD).getResponse().getStatus())
                .isEqualTo(200);
        assertThat(ownerJdbc().queryForObject("select m.last_login_at is not null from memberships m "
                        + "join users u on u.id = m.user_id where u.email = ?", Boolean.class, email)).isTrue();
    }

    @Test
    void invalidBodyReturns422() throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void meReturnsTheIdentityFromTheTokenWithoutPasswordData() throws Exception {
        String email = member("eu", "OWNER");
        ownerJdbc().update("update users set name = 'Dono da 77xp' where email = ?", email);

        String body = mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.name").value("Dono da 77xp"))
                .andExpect(jsonPath("$.data.orgId").value(RootOrganization.ID.toString()))
                .andExpect(jsonPath("$.data.role").value("OWNER"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("argon2").doesNotContain("passwordHash");
    }

    @Test
    void meRejectsATokenWhoseMembershipWasBlocked() throws Exception {
        String email = member("me-bloqueado", "TEAM");
        String token = TestAuth.accessToken(mockMvc, email);
        blockMembership(email);

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesTheCookieAndTheOldOneStopsWorking() throws Exception {
        Cookie first = TestAuth.refreshCookie(mockMvc, member("renova", "TEAM"));

        MvcResult renewed = mockMvc.perform(post("/auth/refresh").cookie(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();
        Cookie second = renewed.getResponse().getCookie("xp_refresh");

        assertThat(second.getValue()).isNotEqualTo(first.getValue());
        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());
    }

    @Test
    void reusingARotatedRefreshTokenEndsEverySession() throws Exception {
        Cookie t1 = TestAuth.refreshCookie(mockMvc, member("roubo", "TEAM"));
        Cookie t2 = mockMvc.perform(post("/auth/refresh").cookie(t1)).andReturn().getResponse().getCookie("xp_refresh");

        mockMvc.perform(post("/auth/refresh").cookie(t1)).andExpect(status().isUnauthorized());
        // t2 era legítimo e cai junto: é o preço de conter uma cópia do token.
        mockMvc.perform(post("/auth/refresh").cookie(t2)).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshFailsWhenTheMembershipWasBlocked() throws Exception {
        String email = member("renova-bloqueado", "CLIENT");
        Cookie cookie = TestAuth.refreshCookie(mockMvc, email);
        blockMembership(email);

        mockMvc.perform(post("/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsOnlyThatSessionClearsTheCookieAndAlwaysReturns204() throws Exception {
        String email = member("sair", "TEAM");
        Cookie tab1 = TestAuth.refreshCookie(mockMvc, email);
        Cookie tab2 = TestAuth.refreshCookie(mockMvc, email);

        MvcResult logout = mockMvc.perform(post("/auth/logout").cookie(tab1))
                .andExpect(status().isNoContent()).andReturn();

        assertThat(logout.getResponse().getCookie("xp_refresh").getMaxAge()).isZero();
        mockMvc.perform(post("/auth/refresh").cookie(tab1)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/auth/refresh").cookie(tab2)).andExpect(status().isOk());
        // Token desconhecido também dá 204: 404 revelaria quais existem.
        mockMvc.perform(post("/auth/logout").cookie(new Cookie("xp_refresh", "qualquer")))
                .andExpect(status().isNoContent());
    }

    @Test
    void refreshWithoutCookieReturns401() throws Exception {
        mockMvc.perform(post("/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordChecksTheCurrentPasswordAndEndsEverySession() throws Exception {
        String email = member("troca", "ADMIN");
        MvcResult login = TestAuth.login(mockMvc, email, TestAuth.PASSWORD);
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
        Cookie refresh = login.getResponse().getCookie("xp_refresh");

        mockMvc.perform(post("/auth/change-password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"errada-123\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message").value("Senha atual incorreta."));

        MvcResult changed = mockMvc.perform(post("/auth/change-password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + TestAuth.PASSWORD + "\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isNoContent()).andReturn();

        assertThat(changed.getResponse().getCookie("xp_refresh").getMaxAge()).isZero();
        mockMvc.perform(post("/auth/refresh").cookie(refresh)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, "nova-senha-456").getResponse().getStatus()).isEqualTo(200);
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(401);
    }
}
