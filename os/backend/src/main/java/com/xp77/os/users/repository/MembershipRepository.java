package com.xp77.os.users.repository;

import com.xp77.os.users.entity.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId);

    /** Cada linha: [Membership, User]. Mesmo módulo, então a junção fica aqui dentro. */
    @Query("""
           SELECT m, u FROM Membership m, User u
            WHERE u.id = m.userId AND m.orgId = :orgId
            ORDER BY u.email
           """)
    List<Object[]> findMembersWithUsers(@Param("orgId") UUID orgId);

    @Query("""
           SELECT m, u FROM Membership m, User u
            WHERE u.id = m.userId AND m.orgId = :orgId AND m.userId = :userId
           """)
    List<Object[]> findMemberWithUser(@Param("userId") UUID userId, @Param("orgId") UUID orgId);
}
