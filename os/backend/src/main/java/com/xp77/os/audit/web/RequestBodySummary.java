package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * O que foi enviado numa alteração do painel, do tamanho que cabe num registro: texto
 * longo é cortado, lista longa mostra as primeiras e conta o resto, e campo com cara de
 * segredo não é gravado. Vale para toda rota nova de /admin, inclusive as que vierem.
 */
final class RequestBodySummary {

    static final int MAX_TEXT = 280;
    static final int MAX_ITEMS = 20;
    static final int MAX_DEPTH = 5;

    private static final Pattern SECRET_FIELD = Pattern.compile(
            "(?i).*(senha|password|token|secret|segredo|credential|hash|cpf|cartao|card).*");

    private RequestBodySummary() {
    }

    /** @param truncated o corpo passou do limite guardado, e o que sobrou não é JSON inteiro. */
    static Optional<Object> of(byte[] body, boolean truncated, ObjectMapper mapper) {
        if (body == null || body.length == 0) {
            return Optional.empty();
        }
        if (truncated) {
            return Optional.of("(corpo grande demais para o registro)");
        }
        try {
            return Optional.ofNullable(summarize(mapper.readTree(body), 0));
        } catch (IOException notJson) {
            return Optional.of("(corpo que não é JSON)");
        }
    }

    static Object summarize(JsonNode node, int depth) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (depth > MAX_DEPTH) {
            return "(…)";
        }
        if (node.isObject()) {
            Map<String, Object> fields = new LinkedHashMap<>();
            for (Map.Entry<String, JsonNode> field : node.properties()) {
                fields.put(field.getKey(), SECRET_FIELD.matcher(field.getKey()).matches()
                        ? "(oculto)"
                        : summarize(field.getValue(), depth + 1));
            }
            return fields;
        }
        if (node.isArray()) {
            List<Object> items = new ArrayList<>();
            for (int i = 0; i < node.size() && i < MAX_ITEMS; i++) {
                items.add(summarize(node.get(i), depth + 1));
            }
            if (node.size() > MAX_ITEMS) {
                items.add("(mais " + (node.size() - MAX_ITEMS) + ")");
            }
            return items;
        }
        if (node.isTextual()) {
            String text = node.asText();
            return text.length() <= MAX_TEXT
                    ? text
                    : text.substring(0, MAX_TEXT) + "… (" + text.length() + " caracteres)";
        }
        if (node.isNumber()) {
            return node.numberValue();
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        return node.asText();
    }
}
