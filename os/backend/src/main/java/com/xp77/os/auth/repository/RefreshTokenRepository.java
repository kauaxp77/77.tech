package com.xp77.os.auth.repository;

import com.xp77.os.auth.entity.RefreshToken;
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
}
