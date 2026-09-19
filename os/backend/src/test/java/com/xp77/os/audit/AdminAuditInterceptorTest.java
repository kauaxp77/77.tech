package com.xp77.os.audit;

import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Usa um controller só de teste sob /admin, porque a Fundação ainda não tem escrita no painel. */
@AutoConfigureMockMvc
class AdminAuditInterceptorTest extends PostgresTestBase {

    private static final String BROWSER = "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0";

    @Autowired
    private MockMvc mockMvc;

    private Map<String, Object> adminEntry(String entityId) {
        return ownerJdbc().queryForMap("select actor_user_id, ip, user_agent, result, entity_type, "
                + "metadata->>'route' as route, (metadata->>'status')::int as status, "
                + "metadata->'body'->>'name' as name, metadata->'body'->>'password' as password "
                + "from audit_logs where action = 'ADMIN_ACTION' and entity_id = ?", entityId);
    }

    @Test
    void adminWriteIsRecordedWithActorIpDeviceAndMaskedBody() throws Exception {
        String email = TestData.uniqueEmail("admin-audit");
        UUID owner = TestAuth.rootMember(email, "OWNER");
        String item = TestData.unique("item");

        mockMvc.perform(post("/admin/test-audit/items/{itemId}", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .header("User-Agent", BROWSER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Item auditado\",\"password\":\"segredo\"}"))
                .andExpect(status().isCreated());

        assertThat(adminEntry(item))
                .containsEntry("actor_user_id", owner)
                .containsEntry("ip", "127.0.0.1")
                .containsEntry("user_agent", BROWSER)
                .containsEntry("result", "SUCCESS")
                .containsEntry("entity_type", "items")
                .containsEntry("route", "/admin/test-audit/items/{itemId}")
                .containsEntry("status", 201)
                .containsEntry("name", "Item auditado")
                .containsEntry("password", "(oculto)");
    }

    @Test
    void refusedAttemptIsRecordedAsFailure() throws Exception {
        String email = TestData.uniqueEmail("admin-recusa");
        TestAuth.rootMember(email, "ADMIN");
        String item = TestData.unique("item");

        mockMvc.perform(post("/admin/test-audit/items/{itemId}/recusar", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnprocessableEntity());

        assertThat(adminEntry(item)).containsEntry("result", "FAILURE").containsEntry("status", 422);
    }

    @Test
    void readsAreNotRecorded() throws Exception {
        String email = TestData.uniqueEmail("admin-leitura");
        TestAuth.rootMember(email, "OWNER");
        String item = TestData.unique("item");

        mockMvc.perform(get("/admin/test-audit/items/{itemId}", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk());

        assertThat(ownerJdbc().queryForObject("select count(*) from audit_logs where action = 'ADMIN_ACTION' "
                + "and entity_id = ?", Long.class, item)).isZero();
    }

    @TestConfiguration
    static class TestAdminControllerConfig {
        @Bean
        TestAdminController testAdminController() {
            return new TestAdminController();
        }
    }

    @RestController
    @RequestMapping("/admin/test-audit/items")
    static class TestAdminController {

        @PostMapping("/{itemId}")
        ResponseEntity<Map<String, String>> create(@PathVariable String itemId, @RequestBody Map<String, Object> body) {
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", itemId));
        }

        @PostMapping("/{itemId}/recusar")
        void refuse(@PathVariable String itemId) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Dados inválidos");
        }

        @GetMapping("/{itemId}")
        Map<String, String> read(@PathVariable String itemId) {
            return Map.of("id", itemId);
        }
    }
}
