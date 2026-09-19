package com.xp77.os.audit;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminAuditLogsEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogger audit;

    private String tokenFor(String role) throws Exception {
        String email = TestData.uniqueEmail("auditoria-" + role.toLowerCase());
        TestAuth.rootMember(email, role);
        return "Bearer " + TestAuth.accessToken(mockMvc, email);
    }

    private String listAdminActions() throws Exception {
        return mockMvc.perform(get("/admin/audit-logs").param("action", "ADMIN_ACTION").param("size", "100")
                        .header("Authorization", tokenFor("OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pagination.page").value(0))
                .andExpect(jsonPath("$.pagination.size").value(100))
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void ownerListsTheOrganizationsEntriesFilteredByAction() throws Exception {
        String entity = TestData.unique("auditavel");
        OrgContext.runAs(RootOrganization.ID,
                () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of("origem", "teste")));

        String json = listAdminActions();

        assertThat(JsonPath.<List<String>>read(json, "$.data[*].action")).containsOnly("ADMIN_ACTION");
        assertThat(JsonPath.<List<String>>read(json, "$.data[*].entityId")).contains(entity);
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.entityId == '" + entity + "')].metadata.origem"))
                .containsExactly("teste");
    }

    @Test
    void entriesOfAnotherOrganizationNeverShowUp() throws Exception {
        UUID other = TestData.createOrg("Outra organização");
        String entity = TestData.unique("alheio");
        ownerJdbc().update("insert into audit_logs (org_id, action, entity_type, entity_id) "
                + "values (?, 'ADMIN_ACTION', 'Teste', ?)", other, entity);

        assertThat(JsonPath.<List<String>>read(listAdminActions(), "$.data[*].entityId")).doesNotContain(entity);
    }

    @Test
    void teamAndClientCannotReadTheAudit() throws Exception {
        mockMvc.perform(get("/admin/audit-logs").header("Authorization", tokenFor("TEAM")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/audit-logs").header("Authorization", tokenFor("CLIENT")))
                .andExpect(status().isForbidden());
    }
}
