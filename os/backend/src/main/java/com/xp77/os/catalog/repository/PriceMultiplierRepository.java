package com.xp77.os.catalog.repository;

import com.xp77.os.catalog.entity.PriceMultiplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceMultiplierRepository extends JpaRepository<PriceMultiplier, UUID> {

    List<PriceMultiplier> findAllByOrderBySortOrderAscNameAsc();

    List<PriceMultiplier> findByActiveTrueOrderBySortOrderAscNameAsc();

    Optional<PriceMultiplier> findByNameAndActiveTrue(String name);
}
