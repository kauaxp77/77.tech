package com.xp77.os.accounts;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminUsersEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    private record Actor(UUID id, String bearer) {
    }

    private Actor actor(String role) throws Exception {
        String email = TestData.uniqueEmail("contas-" + role.toLowerCase());
        UUID id = TestAuth.rootMember(email, role);
        return new Actor(id, "Bearer " + TestAuth.accessToken(mockMvc, email));
    }

    private ResultActions invite(Actor actor, String email, String name, String role) throws Exception {
        return mockMvc.perform(post("/admin/users/invitations").header("Authorization", actor.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"name\":\"" + name + "\",\"role\":\"" + role + "\"}"));
    }

    private ResultActions action(Actor actor, String action, UUID target) throws Exception {
        return mockMvc.perform(post("/admin/users/{id}/" + action, target).header("Authorization", actor.bearer()));
    }

    private UUID userIdOf(String email) {
        return ownerJdbc().queryForObject("select id from users where email = ?", UUID.class, email);
    }

    private List<Map<String, Object>> invitationsTo(String email) {
        return ownerJdbc().queryForList("select payload->>'role' as role, payload->>'token' as token "
                + "from email_outbox where to_address = ? and template = 'CONVITE' order by created_at", email);
    }

    private ResultActions firstAccess(String token, String password) throws Exception {
        return mockMvc.perform(post("/auth/first-access").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void ownerInvitesAClientWhoCreatesThePasswordAndEntersAsClient() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("cliente");

        invite(owner, email, "Cliente Teste", "CLIENT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.name").value("Cliente Teste"))
                .andExpect(jsonPath("$.data.role").value("CLIENT"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        List<Map<String, Object>> sent = invitationsTo(email);
        assertThat(sent).singleElement().satisfies(mail -> assertThat(mail).containsEntry("role", "CLIENT"));
        firstAccess((String) sent.get(0).get("token"), "senha-do-cliente-1").andExpect(status().isNoContent());

        MvcResult login = TestAuth.login(mockMvc, email, "senha-do-cliente-1");
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.role").value("CLIENT"));
    }

    @Test
    void nobodyInvitesAnOwner() throws Exception {
        invite(actor("OWNER"), TestData.uniqueEmail("outro-dono"), "Outro Dono", "OWNER")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void onlyTheOwnerInvitesAnAdmin() throws Exception {
        invite(actor("ADMIN"), TestData.uniqueEmail("admin-por-admin"), "Admin", "ADMIN")
                .andExpect(status().isForbidden());
        invite(actor("OWNER"), TestData.uniqueEmail("admin-por-dono"), "Admin", "ADMIN")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    @Test
    void adminInvitesTeamAndClient() throws Exception {
        Actor admin = actor("ADMIN");

        invite(admin, TestData.uniqueEmail("equipe"), "Equipe", "TEAM").andExpect(status().isCreated());
        invite(admin, TestData.uniqueEmail("cliente"), "Cliente", "CLIENT").andExpect(status().isCreated());
    }

    @Test
    void anEmailThatAlreadyHasAccessHereIsAConflict() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("repetido");
        invite(owner, email, "Primeiro", "TEAM").andExpect(status().isCreated());

        invite(owner, email.toUpperCase(), "Segundo", "CLIENT")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.message").value("Este e-mail já tem acesso nesta organização."));
    }

    @Test
    void someoneWhoAlreadyHasAPasswordGetsTheInvitationWithoutALink() throws Exception {
        String email = TestData.uniqueEmail("ja-tem-senha");
        UUID person = TestData.createUser(email, TestData.hash("senha-de-outra-org"));
        TestData.addMembership(person, TestData.createOrg("Outra organização"), "TEAM");

        invite(actor("OWNER"), email, "Pessoa", "TEAM")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        assertThat(invitationsTo(email)).singleElement().satisfies(mail -> assertThat(mail.get("token")).isNull());
    }

    @Test
    void listShowsTypeStatusAndLastAccess() throws Exception {
        Actor owner = actor("OWNER");
        String pending = TestData.uniqueEmail("pendente");
        invite(owner, pending, "Pendente", "CLIENT").andExpect(status().isCreated());
        String active = TestData.uniqueEmail("ativo");
        TestAuth.rootMember(active, "TEAM");
        TestAuth.login(mockMvc, active, TestAuth.PASSWORD);
        String blocked = TestData.uniqueEmail("bloqueado");
        action(owner, "block", TestAuth.rootMember(blocked, "TEAM")).andExpect(status().isNoContent());

        String json = mockMvc.perform(get("/admin/users").header("Authorization", owner.bearer()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + pending + "')].status"))
                .containsExactly("PENDING");
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + active + "')].status"))
                .containsExactly("ACTIVE");
        assertThat(JsonPath.<List<Object>>read(json, "$.data[?(@.email == '" + active + "')].lastLoginAt"))
                .singleElement().isNotNull();
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + blocked + "')].status"))
                .containsExactly("BLOCKED");
    }

    @Test
    void resendingTheInvitationInvalidatesThePreviousLink() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("reenvio");
        invite(owner, email, "Reenvio", "TEAM").andExpect(status().isCreated());

        action(owner, "invitation", userIdOf(email)).andExpect(status().isNoContent());

        List<Map<String, Object>> sent = invitationsTo(email);
        assertThat(sent).hasSize(2);
        firstAccess((String) sent.get(0).get("token"), "senha-forte-123").andExpect(status().isBadRequest());
        firstAccess((String) sent.get(1).get("token"), "senha-forte-123").andExpect(status().isNoContent());
    }

    @Test
    void blockingEndsSessionsAndPreventsLoginAndUnblockingRestoresIt() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("sessao-bloqueio");
        UUID member = TestAuth.rootMember(email, "TEAM");
        Cookie session = TestAuth.refreshCookie(mockMvc, email);

        action(owner, "block", member).andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(401);

        action(owner, "unblock", member).andExpect(status().isNoContent());
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void nobodyBlocksThemselvesOrTheOwnerAndOnlyTheOwnerBlocksAnAdmin() throws Exception {
        Actor owner = actor("OWNER");
        Actor admin = actor("ADMIN");
        Actor otherAdmin = actor("ADMIN");

        action(owner, "block", owner.id()).andExpect(status().isForbidden());
        action(admin, "block", owner.id()).andExpect(status().isForbidden());
        action(admin, "block", otherAdmin.id()).andExpect(status().isForbidden());
        action(owner, "block", otherAdmin.id()).andExpect(status().isNoContent());
    }

    @Test
    void unknownAccountIsNotFound() throws Exception {
        action(actor("OWNER"), "block", UUID.randomUUID())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void teamAndClientCannotManageAccounts() throws Exception {
        mockMvc.perform(get("/admin/users").header("Authorization", actor("TEAM").bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/users").header("Authorization", actor("CLIENT").bearer()))
                .andExpect(status().isForbidden());
    }

    @Test
    void accountChangesAreAudited() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("auditado");
        invite(owner, email, "Auditado", "CLIENT").andExpect(status().isCreated());
        UUID invited = userIdOf(email);
        action(owner, "block", invited).andExpect(status().isNoContent());

        assertThat(ownerJdbc().queryForMap("select actor_user_id, result from audit_logs "
                + "where action = 'ADMIN_ACTION' and metadata->>'route' = '/admin/users/invitations' "
                + "and metadata->'body'->>'email' = ?", email))
                .containsEntry("actor_user_id", owner.id()).containsEntry("result", "SUCCESS");
        assertThat(ownerJdbc().queryForMap("select entity_type, result from audit_logs "
                + "where action = 'ADMIN_ACTION' and entity_id = ?", invited.toString()))
                .containsEntry("entity_type", "users").containsEntry("result", "SUCCESS");
    }
}
