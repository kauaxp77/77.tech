package com.xp77.os.catalog;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * O catálogo pela porta da frente: quem pode mexer, o que a API recusa, e o que fica
 * registrado na trilha.
 *
 * Preço é informação comercial e é o número que vai na proposta de um cliente: mudar
 * preço sem deixar rastro do valor anterior é exatamente o que a trilha do admin antigo
 * faz, e é o que este módulo não repete.
 */
@AutoConfigureMockMvc
class CatalogEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    private String bearerOf(String role) throws Exception {
        String email = TestData.uniqueEmail("catalogo-" + role.toLowerCase());
        TestAuth.rootMember(email, role);
        return "Bearer " + TestAuth.accessToken(mockMvc, email);
    }

    private ResultActions createItem(String bearer, String kind, String name, long cents, int weeks)
            throws Exception {
        return mockMvc.perform(post("/admin/catalog/items").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"kind\":\"%s\",\"name\":\"%s\",\"priceCents\":%d,\"weeks\":%d}"
                        .formatted(kind, name, cents, weeks)));
    }

    private String idOf(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private List<Map<String, Object>> auditOf(String entityId) {
        return ownerJdbc().queryForList(
                "select action, metadata->>'priceCentsBefore' as antes, "
                        + "metadata->>'priceCentsAfter' as depois "
                        + "from audit_logs where entity_id = ? order by created_at", entityId);
    }

    @Test
    void theTeamCannotSeeOrChangePrices() throws Exception {
        String team = bearerOf("TEAM");

        mockMvc.perform(get("/admin/catalog/items").header("Authorization", team))
                .andExpect(status().isForbidden());
        createItem(team, "EXTRA", TestData.unique("proibido"), 100_00L, 1)
                .andExpect(status().isForbidden());
    }

    @Test
    void aClientCannotSeePricesEither() throws Exception {
        // Preço de catálogo é informação interna: o cliente vê o que está na proposta
        // dele, não a tabela inteira.
        mockMvc.perform(get("/admin/catalog/items").header("Authorization", bearerOf("CLIENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void withoutASessionThereIsNoCatalogAtAll() throws Exception {
        mockMvc.perform(get("/admin/catalog/items")).andExpect(status().isUnauthorized());
    }

    @Test
    void theOwnerSeesTheSeededCatalog() throws Exception {
        mockMvc.perform(get("/admin/catalog/items").header("Authorization", bearerOf("OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.name == 'Plataforma SaaS / Sistema')].priceCents")
                        .value(800_000));
    }

    @Test
    void aRepeatedNameInTheSameGroupIsRefused() throws Exception {
        String owner = bearerOf("OWNER");
        String name = TestData.unique("repetido");

        createItem(owner, "EXTRA", name, 100_00L, 1).andExpect(status().isCreated());
        createItem(owner, "EXTRA", name, 200_00L, 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.message").value("Já existe um item com este nome neste grupo."));
    }

    @Test
    void theSameNameInAnotherGroupIsFine() throws Exception {
        // "Painel" pode ser um projeto base e um adicional: são coisas diferentes.
        String owner = bearerOf("OWNER");
        String name = TestData.unique("mesmo-nome");

        createItem(owner, "EXTRA", name, 100_00L, 1).andExpect(status().isCreated());
        createItem(owner, "BASE", name, 500_00L, 4).andExpect(status().isCreated());
    }

    @Test
    void changingAPriceRecordsTheValueBeforeAndAfter() throws Exception {
        String owner = bearerOf("OWNER");
        String name = TestData.unique("auditado");
        String id = idOf(createItem(owner, "EXTRA", name, 100_00L, 1).andReturn());

        mockMvc.perform(put("/admin/catalog/items/{id}", id).header("Authorization", owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"EXTRA\",\"name\":\"%s\",\"priceCents\":250000,\"weeks\":3}"
                                .formatted(name)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.priceCents").value(250_000));

        // O antes é o que a trilha do admin antigo não guarda. Sem ele, "virou R$ 2.500"
        // não diz se subiu ou desceu, nem de quanto.
        assertThat(auditOf(id))
                .filteredOn(entry -> "PRICE_ITEM_UPDATED".equals(entry.get("action")))
                .singleElement()
                .satisfies(entry -> {
                    assertThat(entry.get("antes")).isEqualTo("10000");
                    assertThat(entry.get("depois")).isEqualTo("250000");
                });
    }

    @Test
    void archivingHidesTheItemWithoutLosingIt() throws Exception {
        String owner = bearerOf("OWNER");
        String name = TestData.unique("arquivavel");
        String id = idOf(createItem(owner, "EXTRA", name, 100_00L, 1).andReturn());

        mockMvc.perform(post("/admin/catalog/items/{id}/archive", id).header("Authorization", owner))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/catalog/items").header("Authorization", owner))
                .andExpect(jsonPath("$.data[?(@.name == '%s')]".formatted(name)).isEmpty());
        mockMvc.perform(get("/admin/catalog/items?incluirArquivados=true").header("Authorization", owner))
                .andExpect(jsonPath("$.data[?(@.name == '%s')].active".formatted(name)).value(false));
    }

    @Test
    void anArchivedItemCanComeBack() throws Exception {
        String owner = bearerOf("OWNER");
        String name = TestData.unique("restauravel");
        String id = idOf(createItem(owner, "EXTRA", name, 100_00L, 1).andReturn());

        mockMvc.perform(post("/admin/catalog/items/{id}/archive", id).header("Authorization", owner))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/admin/catalog/items/{id}/restore", id).header("Authorization", owner))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/catalog/items").header("Authorization", owner))
                .andExpect(jsonPath("$.data[?(@.name == '%s')].active".formatted(name)).value(true));
    }

    @Test
    void aNegativePriceIsRefusedWithTheFieldNamed() throws Exception {
        createItem(bearerOf("OWNER"), "EXTRA", TestData.unique("negativo"), -1L, 1)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fieldErrors[?(@.field == 'priceCents')]").exists());
    }

    @Test
    void aMultiplierBelowOneIsRefused() throws Exception {
        // Abaixo de 1 seria desconto disfarçado, e desconto tem campo próprio na hora
        // de montar o orçamento — misturar os dois esconde de onde veio o número.
        mockMvc.perform(post("/admin/catalog/multipliers").header("Authorization", bearerOf("OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\",\"factor\":0.80}".formatted(TestData.unique("desconto"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fieldErrors[?(@.field == 'factor')]").exists());
    }

    @Test
    void theSeededMultipliersAreThere() throws Exception {
        mockMvc.perform(get("/admin/catalog/multipliers").header("Authorization", bearerOf("OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.name == 'Agência')].factor").value("1.80"));
    }
}
