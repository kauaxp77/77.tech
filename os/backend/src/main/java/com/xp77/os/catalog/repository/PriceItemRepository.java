package com.xp77.os.catalog.repository;

import com.xp77.os.catalog.entity.PriceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * O RLS já filtra por organização — estas consultas não repetem o org_id de propósito:
 * um WHERE esquecido aqui não vaza nada, o banco recusa antes.
 */
public interface PriceItemRepository extends JpaRepository<PriceItem, UUID> {

    List<PriceItem> findAllByOrderByKindAscSortOrderAscNameAsc();

    List<PriceItem> findByActiveTrueOrderByKindAscSortOrderAscNameAsc();

    Optional<PriceItem> findByKindAndNameAndActiveTrue(String kind, String name);
}
