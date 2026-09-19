package com.xp77.os.security;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SecurityConfigTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwt;

    private String bearer(String role) {
        return "Bearer " + jwt.generate(UUID.randomUUID(), RootOrganization.ID, "pessoa@exemplo.com", role);
    }

    @Test
    void protectedRouteWithoutTokenReturns401Envelope() throws Exception {
        mockMvc.perform(get("/qualquer-rota-protegida"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.status").value(401))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void invalidTokenDoesNotAuthenticate() throws Exception {
        mockMvc.perform(get("/qualquer-rota-protegida").header("Authorization", "Bearer lixo.nao.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void teamMemberGets403EnvelopeOnAdminRoutes() throws Exception {
        mockMvc.perform(get("/admin/qualquer").header("Authorization", bearer("TEAM")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.status").value(403));
    }

    @Test
    void ownerAndAdminPassTheAdminGate() throws Exception {
        mockMvc.perform(get("/admin/rota-inexistente").header("Authorization", bearer("OWNER")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/admin/rota-inexistente").header("Authorization", bearer("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void clientGets403OnAdminRoutes() throws Exception {
        mockMvc.perform(get("/admin/qualquer").header("Authorization", bearer("CLIENT")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void onlyClientsEnterThePortal() throws Exception {
        for (String teamRole : new String[] {"OWNER", "ADMIN", "TEAM"}) {
            mockMvc.perform(get("/portal/qualquer").header("Authorization", bearer(teamRole)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        }
        mockMvc.perform(get("/portal/rota-inexistente").header("Authorization", bearer("CLIENT")))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicRoutesStayOpen() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    @Test
    void meAndChangePasswordRequireAToken() throws Exception {
        mockMvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/auth/change-password").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessDeniedThrownByAControllerBecomes403Envelope() throws Exception {
        mockMvc.perform(get("/test-security/denied").header("Authorization", bearer("TEAM")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.message").value("Acesso negado"));
    }

    @Test
    void corsAllowsOnlyTheConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://malicioso.exemplo")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @TestConfiguration
    static class DeniedControllerConfig {
        @Bean
        DeniedController deniedController() {
            return new DeniedController();
        }
    }

    @RestController
    static class DeniedController {
        @GetMapping("/test-security/denied")
        void denied() {
            throw new AccessDeniedException("negado");
        }
    }
}
