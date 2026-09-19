package com.xp77.os.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Um item do catálogo de preços: "Plataforma SaaS, R$ 8.000, 8 semanas".
 *
 * Preço em centavos inteiros. Item não se apaga — arquiva-se (active = false), porque
 * uma proposta antiga precisa continuar explicável.
 */
@Entity
@Table(name = "price_items")
public class PriceItem {

    /** BASE e DESIGN: escolhe um. EXTRA: escolhe quantos quiser. */
    public enum Kind {
        BASE, DESIGN, EXTRA
    }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;

    @Column(nullable = false)
    private String kind;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(nullable = false)
    private int weeks;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected PriceItem() {
    }

    public PriceItem(UUID orgId, Kind kind, String name, long priceCents, int weeks, int sortOrder) {
        this.orgId = orgId;
        this.kind = kind.name();
        this.name = name;
        this.priceCents = priceCents;
        this.weeks = weeks;
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

    public Kind getKind() {
        return Kind.valueOf(kind);
    }

    public String getName() {
        return name;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public int getWeeks() {
        return weeks;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void rename(String newName) {
        this.name = newName;
    }

    public void reprice(long newPriceCents, int newWeeks) {
        this.priceCents = newPriceCents;
        this.weeks = newWeeks;
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
