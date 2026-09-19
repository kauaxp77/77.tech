package com.xp77.os.users.entity;

import com.xp77.os.users.api.MembershipRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Vínculo pessoa × organização: tipo de conta, situação e último acesso.
 * O bloqueio vale para a organização (o vínculo), não para a pessoa no sistema todo.
 * Tabela com RLS por organização a partir da V4.
 */
@Entity
@Table(name = "memberships")
public class Membership {

    public static final String ACTIVE = "ACTIVE";
    public static final String BLOCKED = "BLOCKED";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipRole role;

    @Column(nullable = false)
    private String status = ACTIVE;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected Membership() {
    }

    public Membership(UUID userId, UUID orgId, MembershipRole role) {
        this.userId = userId;
        this.orgId = orgId;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public MembershipRole getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public boolean isActive() {
        return ACTIVE.equals(status);
    }

    public void block() {
        this.status = BLOCKED;
    }

    public void unblock() {
        this.status = ACTIVE;
    }

    public void recordLogin(Instant at) {
        this.lastLoginAt = at;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
