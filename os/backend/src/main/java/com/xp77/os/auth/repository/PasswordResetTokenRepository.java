package com.xp77.os.auth.repository;

import com.xp77.os.auth.entity.PasswordResetToken;
import com.xp77.os.auth.entity.TokenPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Invalida (marca como usados) os links ainda não usados da pessoa com essa finalidade. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now "
            + "WHERE t.userId = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    int invalidateUnused(@Param("userId") UUID userId, @Param("purpose") TokenPurpose purpose,
                         @Param("now") Instant now);
}
