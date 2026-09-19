package com.xp77.os.catalog.controller;

import com.xp77.os.catalog.dto.PriceItemRequest;
import com.xp77.os.catalog.dto.PriceItemResponse;
import com.xp77.os.catalog.dto.PriceMultiplierRequest;
import com.xp77.os.catalog.dto.PriceMultiplierResponse;
import com.xp77.os.catalog.service.CatalogService;
import com.xp77.os.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Catálogo de preços. Fica sob /admin porque só OWNER e ADMIN mexem em preço — a
 * SecurityConfig já barra o resto nesse prefixo, e o AdminAuditInterceptor já registra
 * cada chamada.
 */
@RestController
@RequestMapping("/admin/catalog")
public class CatalogController {

    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/items")
    public ResponseEntity<ApiResponse<List<PriceItemResponse>>> listItems(
            @RequestParam(name = "incluirArquivados", defaultValue = "false") boolean includeArchived) {
        return ResponseEntity.ok(ApiResponse.ok(
                catalog.listItems(includeArchived).stream().map(PriceItemResponse::from).toList()));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<PriceItemResponse>> createItem(
            @Valid @RequestBody PriceItemRequest request) {
        PriceItemResponse created = PriceItemResponse.from(catalog.createItem(
                request.kind(), request.name(), request.priceCents(), request.weeks(),
                request.sortOrder() == null ? 0 : request.sortOrder()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<PriceItemResponse>> updateItem(
            @PathVariable UUID id, @Valid @RequestBody PriceItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(PriceItemResponse.from(
                catalog.updateItem(id, request.name(), request.priceCents(), request.weeks()))));
    }

    @PostMapping("/items/{id}/archive")
    public ResponseEntity<Void> archiveItem(@PathVariable UUID id) {
        catalog.archiveItem(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/items/{id}/restore")
    public ResponseEntity<Void> restoreItem(@PathVariable UUID id) {
        catalog.restoreItem(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/items/order")
    public ResponseEntity<Void> reorderItems(@RequestBody List<UUID> idsInOrder) {
        catalog.reorderItems(idsInOrder);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/multipliers")
    public ResponseEntity<ApiResponse<List<PriceMultiplierResponse>>> listMultipliers(
            @RequestParam(name = "incluirArquivados", defaultValue = "false") boolean includeArchived) {
        return ResponseEntity.ok(ApiResponse.ok(catalog.listMultipliers(includeArchived).stream()
                .map(PriceMultiplierResponse::from).toList()));
    }

    @PostMapping("/multipliers")
    public ResponseEntity<ApiResponse<PriceMultiplierResponse>> createMultiplier(
            @Valid @RequestBody PriceMultiplierRequest request) {
        PriceMultiplierResponse created = PriceMultiplierResponse.from(catalog.createMultiplier(
                request.name(), request.factor(),
                request.sortOrder() == null ? 0 : request.sortOrder()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/multipliers/{id}")
    public ResponseEntity<ApiResponse<PriceMultiplierResponse>> updateMultiplier(
            @PathVariable UUID id, @Valid @RequestBody PriceMultiplierRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(PriceMultiplierResponse.from(
                catalog.updateMultiplier(id, request.name(), request.factor()))));
    }

    @PostMapping("/multipliers/{id}/archive")
    public ResponseEntity<Void> archiveMultiplier(@PathVariable UUID id) {
        catalog.archiveMultiplier(id);
        return ResponseEntity.noContent().build();
    }
}
