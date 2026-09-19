package com.xp77.os.catalog.service;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.catalog.entity.PriceItem;
import com.xp77.os.catalog.entity.PriceMultiplier;
import com.xp77.os.catalog.repository.PriceItemRepository;
import com.xp77.os.catalog.repository.PriceMultiplierRepository;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Catálogo de preços: criar, editar, arquivar e reordenar.
 *
 * Toda alteração de preço vai para a trilha de auditoria COM O VALOR ANTERIOR. A trilha
 * do admin antigo só guarda o valor novo — quando um preço cai de R$ 50.000 para
 * R$ 5.000, ela diz "virou R$ 5.000" e o que havia antes some. Aqui não.
 */
@Service
public class CatalogService {

    private final PriceItemRepository items;
    private final PriceMultiplierRepository multipliers;
    private final AuditLogger audit;

    public CatalogService(PriceItemRepository items, PriceMultiplierRepository multipliers,
                          AuditLogger audit) {
        this.items = items;
        this.multipliers = multipliers;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PriceItem> listItems(boolean includeArchived) {
        return includeArchived
                ? items.findAllByOrderByKindAscSortOrderAscNameAsc()
                : items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc();
    }

    @Transactional(readOnly = true)
    public List<PriceMultiplier> listMultipliers(boolean includeArchived) {
        return includeArchived
                ? multipliers.findAllByOrderBySortOrderAscNameAsc()
                : multipliers.findByActiveTrueOrderBySortOrderAscNameAsc();
    }

    @Transactional
    public PriceItem createItem(PriceItem.Kind kind, String name, long priceCents, int weeks,
                                int sortOrder) {
        ensureItemNameIsFree(kind, name, null);
        PriceItem saved = items.save(new PriceItem(currentOrg(), kind, name, priceCents, weeks, sortOrder));
        audit.record("PRICE_ITEM_CREATED", "PriceItem", saved.getId().toString(),
                Map.of("kind", kind.name(), "name", name, "priceCents", priceCents, "weeks", weeks));
        return saved;
    }

    @Transactional
    public PriceItem updateItem(UUID id, String name, long priceCents, int weeks) {
        PriceItem item = items.findById(id).orElseThrow(() -> notFound("Item de preço"));
        ensureItemNameIsFree(item.getKind(), name, id);

        // O antes é capturado ANTES de mexer: depois já era.
        Map<String, Object> change = new HashMap<>();
        change.put("nameBefore", item.getName());
        change.put("priceCentsBefore", item.getPriceCents());
        change.put("weeksBefore", item.getWeeks());

        item.rename(name);
        item.reprice(priceCents, weeks);

        change.put("nameAfter", name);
        change.put("priceCentsAfter", priceCents);
        change.put("weeksAfter", weeks);
        audit.record("PRICE_ITEM_UPDATED", "PriceItem", id.toString(), change);
        return item;
    }

    @Transactional
    public void archiveItem(UUID id) {
        PriceItem item = items.findById(id).orElseThrow(() -> notFound("Item de preço"));
        item.archive();
        audit.record("PRICE_ITEM_ARCHIVED", "PriceItem", id.toString(),
                Map.of("name", item.getName(), "priceCents", item.getPriceCents()));
    }

    @Transactional
    public void restoreItem(UUID id) {
        PriceItem item = items.findById(id).orElseThrow(() -> notFound("Item de preço"));
        ensureItemNameIsFree(item.getKind(), item.getName(), id);
        item.restore();
        audit.record("PRICE_ITEM_RESTORED", "PriceItem", id.toString(), Map.of("name", item.getName()));
    }

    /** Reordenar é arrastar na tela: chega a lista inteira na ordem nova. */
    @Transactional
    public void reorderItems(List<UUID> idsInOrder) {
        int position = 1;
        for (UUID id : idsInOrder) {
            items.findById(id).orElseThrow(() -> notFound("Item de preço")).moveTo(position++);
        }
        audit.record("PRICE_ITEMS_REORDERED", "PriceItem", null, Map.of("count", idsInOrder.size()));
    }

    @Transactional
    public PriceMultiplier createMultiplier(String name, BigDecimal factor, int sortOrder) {
        ensureMultiplierNameIsFree(name, null);
        PriceMultiplier saved = multipliers.save(new PriceMultiplier(currentOrg(), name, factor, sortOrder));
        audit.record("PRICE_MULTIPLIER_CREATED", "PriceMultiplier", saved.getId().toString(),
                Map.of("name", name, "factor", factor.toPlainString()));
        return saved;
    }

    @Transactional
    public PriceMultiplier updateMultiplier(UUID id, String name, BigDecimal factor) {
        PriceMultiplier multiplier = multipliers.findById(id)
                .orElseThrow(() -> notFound("Multiplicador"));
        ensureMultiplierNameIsFree(name, id);

        Map<String, Object> change = new HashMap<>();
        change.put("nameBefore", multiplier.getName());
        change.put("factorBefore", multiplier.getFactor().toPlainString());

        multiplier.update(name, factor);

        change.put("nameAfter", name);
        change.put("factorAfter", factor.toPlainString());
        audit.record("PRICE_MULTIPLIER_UPDATED", "PriceMultiplier", id.toString(), change);
        return multiplier;
    }

    @Transactional
    public void archiveMultiplier(UUID id) {
        PriceMultiplier multiplier = multipliers.findById(id)
                .orElseThrow(() -> notFound("Multiplicador"));
        multiplier.archive();
        audit.record("PRICE_MULTIPLIER_ARCHIVED", "PriceMultiplier", id.toString(),
                Map.of("name", multiplier.getName()));
    }

    private void ensureItemNameIsFree(PriceItem.Kind kind, String name, UUID allowedId) {
        items.findByKindAndNameAndActiveTrue(kind.name(), name)
                .filter(found -> !found.getId().equals(allowedId))
                .ifPresent(found -> {
                    throw new BusinessException(ErrorCode.CONFLICT,
                            "Já existe um item com este nome neste grupo.");
                });
    }

    private void ensureMultiplierNameIsFree(String name, UUID allowedId) {
        multipliers.findByNameAndActiveTrue(name)
                .filter(found -> !found.getId().equals(allowedId))
                .ifPresent(found -> {
                    throw new BusinessException(ErrorCode.CONFLICT,
                            "Já existe um multiplicador com este nome.");
                });
    }

    private static UUID currentOrg() {
        return OrgContext.current().orElseThrow(() ->
                new BusinessException(ErrorCode.UNAUTHORIZED, "Sessão inválida ou expirada"));
    }

    private static NotFoundException notFound(String what) {
        return new NotFoundException(what + " não encontrado nesta organização");
    }
}
