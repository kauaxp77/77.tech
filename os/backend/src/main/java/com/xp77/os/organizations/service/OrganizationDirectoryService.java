package com.xp77.os.organizations.service;

import com.xp77.os.organizations.api.OrganizationDirectory;
import com.xp77.os.organizations.api.OrganizationSummary;
import com.xp77.os.organizations.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class OrganizationDirectoryService implements OrganizationDirectory {

    private final OrganizationRepository organizations;

    public OrganizationDirectoryService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationSummary> find(UUID id) {
        return organizations.findById(id)
                .map(organization -> new OrganizationSummary(organization.getId(), organization.getName(),
                        organization.getSlug()));
    }
}
