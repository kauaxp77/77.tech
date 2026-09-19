package com.xp77.os.organizations.service;

import com.xp77.os.organizations.api.OrgResolver;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.organizations.entity.Organization;
import com.xp77.os.organizations.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class DomainOrgResolver implements OrgResolver {

    private final OrganizationRepository organizations;

    public DomainOrgResolver(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID resolve(String host) {
        if (host == null || host.isBlank()) {
            return RootOrganization.ID;
        }
        String domain = host.trim().toLowerCase(Locale.ROOT);
        return organizations.findByDomainAndActiveTrue(domain)
                .map(Organization::getId)
                .orElse(RootOrganization.ID);
    }
}
