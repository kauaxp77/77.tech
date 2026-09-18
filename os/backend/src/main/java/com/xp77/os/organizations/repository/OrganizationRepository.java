package com.xp77.os.organizations.repository;

import com.xp77.os.organizations.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByDomainAndActiveTrue(String domain);
}
