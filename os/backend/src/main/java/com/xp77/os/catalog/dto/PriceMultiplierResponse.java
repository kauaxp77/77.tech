package com.xp77.os.catalog.dto;

import com.xp77.os.catalog.entity.PriceMultiplier;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceMultiplierResponse(UUID id, String name, BigDecimal factor, int sortOrder,
                                      boolean active) {

    public static PriceMultiplierResponse from(PriceMultiplier multiplier) {
        return new PriceMultiplierResponse(multiplier.getId(), multiplier.getName(),
                multiplier.getFactor(), multiplier.getSortOrder(), multiplier.isActive());
    }
}
