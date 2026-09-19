package com.xp77.os.catalog.dto;

import com.xp77.os.catalog.entity.PriceItem;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Preço em CENTAVOS: a tela mostra reais, a API fala centavos. Número quebrado de reais
 * atravessando JSON vira ponto flutuante, e ponto flutuante perde centavo.
 */
public record PriceItemRequest(
        @NotNull(message = "Informe o grupo")
        PriceItem.Kind kind,

        @NotBlank(message = "Informe o nome")
        @Size(max = 120, message = "O nome pode ter até 120 caracteres")
        String name,

        @NotNull(message = "Informe o preço")
        @Min(value = 0, message = "O preço não pode ser negativo")
        // Um trilhão de centavos (10 bilhões de reais) é dedo escorregado, não orçamento.
        @Max(value = 1_000_000_000_000L, message = "Preço fora do razoável")
        Long priceCents,

        @NotNull(message = "Informe o prazo")
        @Min(value = 0, message = "O prazo não pode ser negativo")
        @Max(value = 520, message = "O prazo não pode passar de dez anos")
        Integer weeks,

        @Min(value = 0, message = "A ordem não pode ser negativa")
        Integer sortOrder) {
}
