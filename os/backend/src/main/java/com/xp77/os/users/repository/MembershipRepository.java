package com.xp77.os.users.repository;

import com.xp77.os.users.entity.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId);
}
