package com.xp77.os.security;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Limite baixo só nesta classe; o perfil de teste usa um alto para não atrapalhar as outras. */
@AutoConfigureMockMvc
@TestPropertySource(properties = "xp77.rate-limit.per-minute=5")
class RateLimitFilterTest extends PostgresTestBase {

    private static final String LOGIN = "{\"email\":\"forca@bruta.com\",\"password\":\"tentativa\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitFilter filter;

    private MockHttpServletRequestBuilder login(String remoteAddr, String forwardedFor) {
        MockHttpServletRequestBuilder request = post("/auth/login")
                .with(r -> {
                    r.setRemoteAddr(remoteAddr);
                    return r;
                })
                .contentType(MediaType.APPLICATION_JSON).content(LOGIN);
        return forwardedFor == null ? request : request.header("X-Forwarded-For", forwardedFor);
    }

    @Test
    void tooManyLoginAttemptsReturn429InTheEnvelope() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.0.0.1", null));
        }

        mockMvc.perform(login("10.0.0.1", null))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.error.status").value(429));
    }

    @Test
    void anotherAddressIsNotAffected() throws Exception {
        for (int i = 0; i < filter.limit() + 2; i++) {
            mockMvc.perform(login("10.0.0.2", null));
        }

        mockMvc.perform(login("10.0.0.3", null)).andExpect(status().isUnauthorized());
    }

    @Test
    void visitorsBehindTheTrustedProxyAreToldApartByTheAddressItRecorded() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.9.9.9", "200.1.1.1"));
        }

        mockMvc.perform(login("10.9.9.9", "200.1.1.1")).andExpect(status().isTooManyRequests());
        mockMvc.perform(login("10.9.9.9", "200.2.2.2")).andExpect(status().isUnauthorized());
    }

    @Test
    void forgingTheFirstForwardedValueDoesNotEscapeTheLimit() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.9.9.8", "198.18.0." + i + ", 200.3.3.3"));
        }

        // Valor forjado novo a cada tentativa: no Beto_Banco isso criava um contador novo.
        mockMvc.perform(login("10.9.9.8", "198.18.1.99, 200.3.3.3")).andExpect(status().isTooManyRequests());
    }

    @Test
    void theRouteWideLimitHoldsEvenWithManyAddresses() throws Exception {
        String route = "/auth/forgot-password";
        String body = "{\"email\":\"ninguem@exemplo.com\"}";
        for (int i = 0; i < filter.routeWideLimit(route); i++) {
            mockMvc.perform(post(route).header("X-Forwarded-For", "198.51." + (i / 250) + "." + (i % 250))
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        mockMvc.perform(post(route).header("X-Forwarded-For", "203.0.113.7")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void firstAccessIsLimitedToo() throws Exception {
        String body = "{\"token\":\"" + UUID.randomUUID() + "\",\"password\":\"senha-forte-123\"}";
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(post("/auth/first-access").with(r -> {
                r.setRemoteAddr("10.0.0.7");
                return r;
            }).contentType(MediaType.APPLICATION_JSON).content(body));
        }

        mockMvc.perform(post("/auth/first-access").with(r -> {
                    r.setRemoteAddr("10.0.0.7");
                    return r;
                }).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void routesOutsideAuthAreNotLimited() throws Exception {
        for (int i = 0; i < filter.limit() + 5; i++) {
            mockMvc.perform(get("/actuator/health").with(r -> {
                r.setRemoteAddr("10.0.0.4");
                return r;
            }));
        }

        mockMvc.perform(get("/actuator/health").with(r -> {
            r.setRemoteAddr("10.0.0.4");
            return r;
        })).andExpect(status().isOk());
    }
}
