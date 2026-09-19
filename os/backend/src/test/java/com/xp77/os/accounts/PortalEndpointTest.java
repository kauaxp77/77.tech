package com.xp77.os.accounts;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PortalEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void clientSeesNameEmailAndOrganizationForTheWelcomeScreen() throws Exception {
        String email = TestData.uniqueEmail("portal");
        UUID client = TestAuth.rootMember(email, "CLIENT");
        ownerJdbc().update("update users set name = 'Cliente Portal' where id = ?", client);

        mockMvc.perform(get("/portal/me").header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Cliente Portal"))
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.organizationName").value("77xp"));
    }

    @Test
    void aBlockedClientIsRefused() throws Exception {
        String email = TestData.uniqueEmail("portal-bloqueado");
        UUID client = TestAuth.rootMember(email, "CLIENT");
        String token = TestAuth.accessToken(mockMvc, email);
        ownerJdbc().update("update memberships set status = 'BLOCKED' where user_id = ? and org_id = ?",
                client, RootOrganization.ID);

        mockMvc.perform(get("/portal/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
