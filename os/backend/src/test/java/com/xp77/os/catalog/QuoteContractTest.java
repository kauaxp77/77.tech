package com.xp77.os.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.catalog.service.QuoteCalculator;
import com.xp77.os.catalog.service.QuoteCalculator.Chosen;
import com.xp77.os.catalog.service.QuoteCalculator.Line;
import com.xp77.os.catalog.service.QuoteCalculator.Quote;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A mesma conta existe duas vezes: aqui, em Java, que é a verdade na hora de emitir uma
 * proposta, e no TypeScript (os/frontend/src/api/orcamento.ts), que dá o número na hora
 * enquanto a pessoa monta o orçamento na tela — pedir ao servidor a cada clique deixaria
 * a tela lenta.
 *
 * Duas implementações divergem. Foi assim que o sistema chegou a ter quatro tabelas de
 * preço discordando. A cerca é este arquivo de casos, lido pelos DOIS lados: qualquer
 * diferença quebra o CI antes de virar um número errado na proposta de um cliente.
 */
class QuoteContractTest {

    private static final Path CONTRACT = Path.of("..", "contratos", "casos-de-orcamento.json");

    private static final QuoteCalculator calculator = new QuoteCalculator();

    private static JsonNode contract() throws IOException {
        return new ObjectMapper().readTree(Files.readString(CONTRACT));
    }

    @TestFactory
    List<DynamicTest> everyContractCaseMatches() throws IOException {
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode caso : contract().get("casos")) {
            tests.add(DynamicTest.dynamicTest(caso.get("nome").asText(), () -> {
                List<Line> lines = new ArrayList<>();
                caso.get("linhas").forEach(line -> lines.add(new Line(
                        line.get("nome").asText(),
                        line.get("centavos").asLong(),
                        line.get("semanas").asInt())));

                Quote quote = calculator.calculate(new Chosen(lines,
                        new BigDecimal(caso.get("multiplicador").asText()),
                        null,
                        caso.get("descontoPercent").asInt()));

                JsonNode expected = caso.get("esperado");
                assertThat(quote.subtotalCents()).isEqualTo(expected.get("subtotal").asLong());
                assertThat(quote.multiplierFeeCents()).isEqualTo(expected.get("taxa").asLong());
                assertThat(quote.discountCents()).isEqualTo(expected.get("desconto").asLong());
                assertThat(quote.totalCents()).isEqualTo(expected.get("total").asLong());
                assertThat(quote.weeks()).isEqualTo(expected.get("semanas").asInt());
            }));
        }
        return tests;
    }

    @Test
    void theContractFileIsNotEmpty() throws IOException {
        // Um arquivo de casos vazio passaria em tudo e não protegeria nada — foi o que
        // aconteceu com o `npm run lint` que rodava sem checar arquivo nenhum.
        assertThat(contract().get("casos")).hasSizeGreaterThanOrEqualTo(8);
    }
}
