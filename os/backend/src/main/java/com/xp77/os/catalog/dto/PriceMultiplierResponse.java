package com.xp77.os.catalog.dto;

import com.xp77.os.catalog.entity.PriceMultiplier;

import java.util.UUID;

/**
 * O fator sai como TEXTO ("1.80"), não como número JSON.
 *
 * Em JSON, 1.80 vira 1.8 — o zero à direita some, e quem lê do outro lado recebe um
 * ponto flutuante. Para um fator que multiplica dinheiro, texto é o formato honesto:
 * chega exatamente como foi gravado, e quem precisa da conta converte de propósito.
 */
public record PriceMultiplierResponse(UUID id, String name, String factor, int sortOrder,
                                      boolean active) {

    public static PriceMultiplierResponse from(PriceMultiplier multiplier) {
        return new PriceMultiplierResponse(multiplier.getId(), multiplier.getName(),
                multiplier.getFactor().toPlainString(), multiplier.getSortOrder(), multiplier.isActive());
    }
}
