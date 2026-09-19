package com.xp77.os.support;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.auth.service.RefreshCookies;
import com.xp77.os.organizations.api.RootOrganization;
import jakarta.servlet.http.Cookie;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Cria contas na organização raiz e entra por /auth/login, como o navegador faria. */
public final class TestAuth {

    public static final String PASSWORD = "senha-forte-123";

    private TestAuth() {
    }

    /** Pessoa com senha e vínculo ativo na 77xp (o MockMvc usa o host localhost → raiz). */
    public static UUID rootMember(String email, String role) {
        UUID user = TestData.createUser(email, TestData.hash(PASSWORD));
        TestData.addMembership(user, RootOrganization.ID, role);
        return user;
    }

    public static String loginBody(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    public static MvcResult login(MockMvc mockMvc, String email, String password) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, password)))
                .andReturn();
    }

    public static String accessToken(MockMvc mockMvc, String email) throws Exception {
        MvcResult result = login(mockMvc, email, PASSWORD);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.accessToken");
    }

    public static Cookie refreshCookie(MockMvc mockMvc, String email) throws Exception {
        MvcResult result = login(mockMvc, email, PASSWORD);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return result.getResponse().getCookie(RefreshCookies.NAME);
    }
}
