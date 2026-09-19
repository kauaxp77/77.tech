package com.xp77.os.email.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "email_outbox")
public class EmailOutbox {

    public static final String PENDING = "PENDING";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";

    /** Espera antes da 2ª, 3ª, 4ª, 5ª e 6ª tentativa. Falhou a 6ª: FAILED. */
    private static final List<Duration> BACKOFF = List.of(
            Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(30),
            Duration.ofHours(2), Duration.ofHours(12));

    private static final int MAX_ERROR = 1000;

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "to_address", nullable = false)
    private String toAddress;

    @Column(nullable = false)
    private String template;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "dedup_key", nullable = false)
    private String dedupKey;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected EmailOutbox() {
    }

    public EmailOutbox(UUID orgId, String toAddress, String template, String payload, String dedupKey) {
        this.orgId = orgId;
        this.toAddress = toAddress;
        this.template = template;
        this.payload = payload;
        this.dedupKey = dedupKey;
    }

    public void markSent(Instant at) {
        this.status = SENT;
        this.sentAt = at;
        this.errorMessage = null;
    }

    public void registerFailure(String error, Instant now) {
        this.attempts++;
        this.errorMessage = error == null ? "erro desconhecido" : error.substring(0, Math.min(error.length(), MAX_ERROR));
        if (attempts > BACKOFF.size()) {
            this.status = FAILED;
        } else {
            this.status = PENDING;
            this.nextAttemptAt = now.plus(BACKOFF.get(attempts - 1));
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public String getToAddress() {
        return toAddress;
    }

    public String getTemplate() {
        return template;
    }

    public String getPayload() {
        return payload;
    }

    public String getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getDedupKey() {
        return dedupKey;
    }
}
