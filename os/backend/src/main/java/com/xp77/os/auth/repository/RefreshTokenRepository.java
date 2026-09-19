package com.xp77.os.auth.repository;

import com.xp77.os.auth.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Como findByTokenHash, mas travando a linha até o fim da transação. A rotação
     * precisa disso: duas renovações simultâneas com o MESMO token roubado veriam as
     * duas que ele ainda não foi trocado, criariam dois sucessores e o reuso nunca
     * seria detectado. Com a trava, a segunda espera, enxerga replaced_by e derruba tudo.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.tokenHash = :tokenHash")
    Optional<RefreshToken> lockByTokenHash(@Param("tokenHash") String tokenHash);

    /** Sessões vigentes, da mais antiga para a mais nova: a ordem em que o limite derruba. */
    @Query("""
           SELECT t FROM RefreshToken t
            WHERE t.userId = :userId
              AND t.revokedAt IS NULL
              AND t.expiresAt > CURRENT_TIMESTAMP
            ORDER BY t.issuedAt ASC
           """)
    List<RefreshToken> findActiveByUser(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now WHERE t.userId = :userId AND t.revokedAt IS NULL")
    int revokeAllActive(@Param("userId") UUID userId, @Param("now") Instant now);

    /** Só as sessões nascidas numa organização: é o alcance de um bloqueio de vínculo. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now "
            + "WHERE t.userId = :userId AND t.orgId = :orgId AND t.revokedAt IS NULL")
    int revokeActiveInOrganization(@Param("userId") UUID userId, @Param("orgId") UUID orgId,
                                   @Param("now") Instant now);
}
