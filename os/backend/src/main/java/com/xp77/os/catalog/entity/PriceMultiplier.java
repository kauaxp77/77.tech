package com.xp77.os.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Um multiplicador do orçamento: "Agência, 1,8×". Vira a linha "Taxa de agência".
 *
 * Nunca abaixo de 1: multiplicador menor que 1 seria desconto disfarçado, e desconto
 * tem campo próprio na hora de montar o orçamento.
 */
@Entity
@Table(name = "price_multipliers")
public class PriceMultiplier {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal factor;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected PriceMultiplier() {
    }

    public PriceMultiplier(UUID orgId, String name, BigDecimal factor, int sortOrder) {
        this.orgId = orgId;
        this.name = name;
        this.factor = factor;
        this.sortOrder = sortOrder;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getFactor() {
        return factor;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public void update(String newName, BigDecimal newFactor) {
        this.name = newName;
        this.factor = newFactor;
    }

    public void moveTo(int newSortOrder) {
        this.sortOrder = newSortOrder;
    }

    public void archive() {
        this.active = false;
    }

    public void restore() {
        this.active = true;
    }
}
