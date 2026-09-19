package com.xp77.os.catalog.dto;

import com.xp77.os.catalog.entity.PriceItem;

import java.util.UUID;

public record PriceItemResponse(UUID id, String kind, String name, long priceCents, int weeks,
                                int sortOrder, boolean active) {

    public static PriceItemResponse from(PriceItem item) {
        return new PriceItemResponse(item.getId(), item.getKind().name(), item.getName(),
                item.getPriceCents(), item.getWeeks(), item.getSortOrder(), item.isActive());
    }
}
