package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RequestBodySummaryTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private Object summary(String json) {
        return RequestBodySummary.of(json.getBytes(StandardCharsets.UTF_8), false, mapper).orElseThrow();
    }

    @Test
    void secretLookingFieldsAreNotStored() {
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("""
                {"email":"a@b.com","novaSenha":"123456","refreshToken":"abc","credential":"x"}""");

        assertThat(fields).containsEntry("email", "a@b.com")
                .containsEntry("novaSenha", "(oculto)")
                .containsEntry("refreshToken", "(oculto)")
                .containsEntry("credential", "(oculto)");
    }

    @Test
    void longTextIsCutAndSaysHowLongItWas() {
        String longText = "x".repeat(1000);
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("{\"texto\":\"" + longText + "\"}");

        assertThat((String) fields.get("texto"))
                .startsWith("x".repeat(RequestBodySummary.MAX_TEXT))
                .endsWith("… (1000 caracteres)");
    }

    @Test
    void longListShowsTheFirstItemsAndCountsTheRest() {
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < 64; i++) {
            ids.append(i == 0 ? "" : ",").append(i);
        }
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("{\"itens\":[" + ids + "]}");

        @SuppressWarnings("unchecked")
        var list = (List<Object>) fields.get("itens");
        assertThat(list).hasSize(RequestBodySummary.MAX_ITEMS + 1).last().isEqualTo("(mais 44)");
    }

    @Test
    void truncatedOrNonJsonBodyBecomesANotice() {
        assertThat(RequestBodySummary.of("{\"a\":".getBytes(StandardCharsets.UTF_8), true, mapper))
                .contains("(corpo grande demais para o registro)");
        assertThat(RequestBodySummary.of("nao e json".getBytes(StandardCharsets.UTF_8), false, mapper))
                .contains("(corpo que não é JSON)");
        assertThat(RequestBodySummary.of(new byte[0], false, mapper)).isEmpty();
    }

    @Test
    void theEntityComesFromTheRoute() {
        assertThat(AdminAuditInterceptor.entityOf("/admin/users/{id}/block", Map.of("id", "u-1")))
                .containsExactly("users", "u-1");
        assertThat(AdminAuditInterceptor.entityOf("/admin/leads/{id}/status/{novo}",
                Map.of("id", "lead-1", "novo", "WON"))).containsExactly("leads", "lead-1");
        assertThat(AdminAuditInterceptor.entityOf("/admin/users/invitations", Map.of()))
                .containsExactly("invitations", null);
    }
}
