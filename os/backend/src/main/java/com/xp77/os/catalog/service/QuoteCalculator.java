package com.xp77.os.catalog.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * A conta do orçamento: soma os itens, aplica o multiplicador, aplica o desconto.
 *
 * Fica no backend porque a calculadora pública e a proposta do painel precisam dar o
 * MESMO número. Duas implementações voltariam a divergir — e foi divergindo que o
 * sistema chegou a ter quatro tabelas de preço discordando entre si.
 *
 * Tudo em centavos inteiros. Ponto flutuante para dinheiro erra no arredondamento, e
 * erra escondido: some um centavo aqui, aparece um ali, e ninguém sabe explicar ao
 * cliente de onde veio a diferença.
 */
@Service
public class QuoteCalculator {

    /** Uma linha do orçamento: o que é, quanto custa, quanto tempo leva. */
    public record Line(String name, long priceCents, int weeks) {
    }

    /** Item escrito na hora, que não fica no catálogo. */
    public record CustomItem(String name, long priceCents, int weeks) {
    }

    /**
     * O que foi escolhido.
     *
     * @param multiplier     1,00 = sem taxa. Abaixo de 1 é recusado: desconto tem campo próprio.
     * @param discountPercent positivo desconta, negativo acrescenta. Entre -100 e 100.
     */
    public record Chosen(List<Line> lines, BigDecimal multiplier, List<CustomItem> customItems,
                         int discountPercent) {
    }

    /**
     * O resultado, aberto em partes para a tela poder mostrar de onde veio cada valor —
     * cliente que vê só o total pergunta "por que tanto?", e ninguém sabe responder.
     */
    public record Quote(List<Line> lines, long subtotalCents, long multiplierFeeCents,
                        long discountCents, long totalCents, int weeks) {
    }

    private static final BigDecimal MIN_MULTIPLIER = BigDecimal.ONE;
    private static final int MAX_DISCOUNT_PERCENT = 100;

    public Quote calculate(Chosen chosen) {
        BigDecimal multiplier = chosen.multiplier() == null ? BigDecimal.ONE : chosen.multiplier();
        if (multiplier.compareTo(MIN_MULTIPLIER) < 0) {
            throw new IllegalArgumentException(
                    "Multiplicador abaixo de 1 seria desconto disfarçado; use o campo de desconto.");
        }
        if (Math.abs(chosen.discountPercent()) > MAX_DISCOUNT_PERCENT) {
            throw new IllegalArgumentException("Desconto tem de ficar entre -100% e 100%.");
        }

        List<Line> lines = new ArrayList<>(chosen.lines());
        if (chosen.customItems() != null) {
            chosen.customItems().forEach(item ->
                    lines.add(new Line(item.name(), item.priceCents(), item.weeks())));
        }

        long subtotal = lines.stream().mapToLong(Line::priceCents).sum();
        int weeks = lines.stream().mapToInt(Line::weeks).sum();

        // A taxa é a diferença, não o total multiplicado: o orçamento mostra "Plataforma
        // R$ 8.000" e "Taxa de agência R$ 6.400", em vez de um R$ 14.400 sem explicação.
        long withMultiplier = round(BigDecimal.valueOf(subtotal).multiply(multiplier));
        long multiplierFee = withMultiplier - subtotal;

        // O desconto incide sobre o SUBTOTAL, não sobre o total com taxa. É a regra que
        // mais se erra, e a que muda mais o número.
        long discount = round(BigDecimal.valueOf(subtotal)
                .multiply(BigDecimal.valueOf(chosen.discountPercent()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));

        long total = Math.max(0L, subtotal + multiplierFee - discount);

        return new Quote(List.copyOf(lines), subtotal, multiplierFee, discount, total, weeks);
    }

    /** Meio centavo vai para cima: é o arredondamento que o cliente espera e que a lei usa. */
    private static long round(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
