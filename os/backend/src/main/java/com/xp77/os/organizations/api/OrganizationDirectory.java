package com.xp77.os.organizations.api;

import java.util.Optional;
import java.util.UUID;

/** Dados públicos de uma organização (nome para as telas de boas-vindas). */
public interface OrganizationDirectory {

    Optional<OrganizationSummary> find(UUID id);
}
