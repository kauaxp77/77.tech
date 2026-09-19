package com.xp77.os.catalog.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PriceMultiplierRequest(
        @NotBlank(message = "Informe o nome")
        @Size(max = 120, message = "O nome pode ter até 120 caracteres")
        String name,

        @NotNull(message = "Informe o multiplicador")
        // Abaixo de 1 seria desconto disfarçado, e desconto tem campo próprio.
        @DecimalMin(value = "1.00", message = "O multiplicador não pode ser menor que 1")
        @DecimalMax(value = "10.00", message = "O multiplicador não pode passar de 10")
        BigDecimal factor,

        @jakarta.validation.constraints.Min(value = 0, message = "A ordem não pode ser negativa")
        Integer sortOrder) {
}
