package com.xp77.os.organizations;

import com.xp77.os.organizations.api.OrgResolver;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OrgResolverTest extends PostgresTestBase {

    @Autowired
    private OrgResolver resolver;

    @Test
    void unknownHostFallsBackToTheRootOrganization() {
        assertThat(resolver.resolve("nao-cadastrado.exemplo.com")).isEqualTo(RootOrganization.ID);
    }

    @Test
    void missingHostFallsBackToTheRootOrganization() {
        assertThat(resolver.resolve(null)).isEqualTo(RootOrganization.ID);
        assertThat(resolver.resolve("  ")).isEqualTo(RootOrganization.ID);
    }

    @Test
    void registeredDomainResolvesToItsOrganizationIgnoringCase() {
        String domain = TestData.unique("cliente") + ".exemplo.com";
        UUID org = TestData.createOrg("Cliente", domain, true);

        assertThat(resolver.resolve(domain.toUpperCase())).isEqualTo(org);
    }

    @Test
    void inactiveOrganizationDomainFallsBackToTheRoot() {
        String domain = TestData.unique("inativa") + ".exemplo.com";
        TestData.createOrg("Inativa", domain, false);

        assertThat(resolver.resolve(domain)).isEqualTo(RootOrganization.ID);
    }
}
