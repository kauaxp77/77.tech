package com.xp77.os.email.repository;

import com.xp77.os.email.entity.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, UUID> {

    Optional<EmailOutbox> findByDedupKey(String dedupKey);

    /**
     * Enfileira sem exceção quando a dedupKey já existe (devolve 0). Capturar a violação
     * de unicidade não serviria: no PostgreSQL o erro aborta a transação de quem chamou.
     */
    @Modifying
    @Query(value = """
            INSERT INTO email_outbox (org_id, to_address, template, payload, dedup_key)
            VALUES (:orgId, :to, :template, CAST(:payload AS jsonb), :dedupKey)
            ON CONFLICT (dedup_key) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("orgId") UUID orgId, @Param("to") String to, @Param("template") String template,
                       @Param("payload") String payload, @Param("dedupKey") String dedupKey);

    /** A próxima mensagem vencida, travada até o fim da transação; as travadas são puladas. */
    @Query(value = """
            SELECT * FROM email_outbox
             WHERE status = 'PENDING' AND next_attempt_at <= :now
             ORDER BY next_attempt_at, created_at
             LIMIT 1
             FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<EmailOutbox> lockNextDue(@Param("now") Instant now);
}
