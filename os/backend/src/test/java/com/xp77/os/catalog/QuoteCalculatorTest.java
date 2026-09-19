package com.xp77.os.catalog;

import com.xp77.os.catalog.service.QuoteCalculator;
import com.xp77.os.catalog.service.QuoteCalculator.Chosen;
import com.xp77.os.catalog.service.QuoteCalculator.CustomItem;
import com.xp77.os.catalog.service.QuoteCalculator.Line;
import com.xp77.os.catalog.service.QuoteCalculator.Quote;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A conta do orçamento. Fica no backend, e não na tela, porque a calculadora pública e
 * a proposta do painel precisam dar o MESMO número — duas implementações voltariam a
 * divergir, que é exatamente a doença que este módulo cura.
 *
 * Tudo em centavos inteiros: dinheiro em ponto flutuante erra no arredondamento.
 */
class QuoteCalculatorTest {

    private static final QuoteCalculator calculator = new QuoteCalculator();

    /** Plataforma SaaS (R$ 8.000, 8 semanas) com design template, sem extras. */
    private static Chosen apenasBase() {
        return new Chosen(List.of(new Line("Plataforma SaaS / Sistema", 800_000L, 8)),
                BigDecimal.ONE, null, 0);
    }

    @Test
    void somaOsItensEOsPrazos() {
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Plataforma SaaS / Sistema", 800_000L, 8),
                        new Line("Design Exclusivo", 150_000L, 2),
                        new Line("Login de usuários", 200_000L, 1)),
                BigDecimal.ONE, null, 0));

        assertThat(quote.subtotalCents()).isEqualTo(1_150_000L);
        assertThat(quote.totalCents()).isEqualTo(1_150_000L);
        assertThat(quote.weeks()).isEqualTo(11);
    }

    @Test
    void oMultiplicadorViraUmaLinhaSeparadaChamadaTaxa() {
        // 1,8× sobre R$ 8.000 dá R$ 14.400; a taxa é a diferença, R$ 6.400.
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Plataforma SaaS / Sistema", 800_000L, 8)),
                new BigDecimal("1.80"), null, 0));

        assertThat(quote.subtotalCents()).isEqualTo(800_000L);
        assertThat(quote.multiplierFeeCents()).isEqualTo(640_000L);
        assertThat(quote.totalCents()).isEqualTo(1_440_000L);
        // A taxa não é trabalho: não acrescenta prazo.
        assertThat(quote.weeks()).isEqualTo(8);
    }

    @Test
    void oDescontoIncideSobreOSubtotal_naoSobreOTotalComTaxa() {
        // Esta é a regra que mais se erra. 10% sobre R$ 8.000 = R$ 800, não 10% de 14.400.
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Plataforma SaaS / Sistema", 800_000L, 8)),
                new BigDecimal("1.80"), null, 10));

        assertThat(quote.discountCents()).isEqualTo(80_000L);
        assertThat(quote.totalCents()).isEqualTo(800_000L + 640_000L - 80_000L);
    }

    @Test
    void umAcrescimoEUmDescontoNegativo() {
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Landing Page Simples", 150_000L, 1)),
                BigDecimal.ONE, null, -20));

        assertThat(quote.discountCents()).isEqualTo(-30_000L);
        assertThat(quote.totalCents()).isEqualTo(180_000L);
    }

    @Test
    void itemPersonalizadoEntraNaContaSemIrParaOCatalogo() {
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Landing Page Simples", 150_000L, 1)),
                BigDecimal.ONE,
                List.of(new CustomItem("Migração de conteúdo", 45_000L, 1)), 0));

        assertThat(quote.subtotalCents()).isEqualTo(195_000L);
        assertThat(quote.weeks()).isEqualTo(2);
        assertThat(quote.lines()).extracting(Line::name).contains("Migração de conteúdo");
    }

    @Test
    void oArredondamentoNuncaPerdeCentavo() {
        // 1,15 × R$ 333,33 = R$ 383,3295. Meio centavo tem de ir para cima, e o total
        // tem de bater exatamente com subtotal + taxa.
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Item quebrado", 33_333L, 0)),
                new BigDecimal("1.15"), null, 0));

        assertThat(quote.multiplierFeeCents()).isEqualTo(5_000L);
        assertThat(quote.totalCents()).isEqualTo(quote.subtotalCents() + quote.multiplierFeeCents());
    }

    @Test
    void semItemNenhumDaZero_naoErro() {
        Quote quote = calculator.calculate(new Chosen(List.of(), BigDecimal.ONE, null, 0));

        assertThat(quote.totalCents()).isZero();
        assertThat(quote.weeks()).isZero();
        assertThat(quote.lines()).isEmpty();
    }

    @Test
    void recusaMultiplicadorMenorQueUm() {
        // Multiplicador abaixo de 1 é desconto disfarçado, e desconto tem campo próprio.
        assertThatThrownBy(() -> calculator.calculate(new Chosen(
                List.of(new Line("Qualquer", 100_000L, 1)), new BigDecimal("0.80"), null, 0)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void recusaDescontoAcimaDeCem() {
        assertThatThrownBy(() -> calculator.calculate(new Chosen(
                List.of(new Line("Qualquer", 100_000L, 1)), BigDecimal.ONE, null, 101)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void oTotalNuncaFicaNegativo() {
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Qualquer", 100_000L, 1)), BigDecimal.ONE, null, 100));

        assertThat(quote.totalCents()).isZero();
    }

    @Test
    void confereComOsNumerosDaCalculadoraDeHoje() {
        // Caso real: SaaS + design exclusivo + login + admin, com taxa de agência.
        // 800.000 + 150.000 + 200.000 + 150.000 = 1.300.000 centavos (R$ 13.000).
        // × 1,8 = R$ 23.400. Prazo: 8 + 2 + 1 + 2 = 13 semanas.
        Quote quote = calculator.calculate(new Chosen(
                List.of(new Line("Plataforma SaaS / Sistema", 800_000L, 8),
                        new Line("Design Exclusivo", 150_000L, 2),
                        new Line("Login de usuários", 200_000L, 1),
                        new Line("Painel administrativo", 150_000L, 2)),
                new BigDecimal("1.80"), null, 0));

        assertThat(quote.subtotalCents()).isEqualTo(1_300_000L);
        assertThat(quote.totalCents()).isEqualTo(2_340_000L);
        assertThat(quote.weeks()).isEqualTo(13);
    }

    @Test
    void semMultiplicadorNaoInventaLinhaDeTaxa() {
        assertThat(calculator.calculate(apenasBase()).multiplierFeeCents()).isZero();
    }
}
