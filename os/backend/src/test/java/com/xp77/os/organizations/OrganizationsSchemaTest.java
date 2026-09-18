package com.xp77.os.organizations;

import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizationsSchemaTest extends PostgresTestBase {

    @Test
    void pgcryptoIsInstalled() {
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_extension where extname = 'pgcrypto'", Long.class)).isEqualTo(1L);
    }

    @Test
    void rootOrganizationExistsWithFixedId() {
        Map<String, Object> root = ownerJdbc().queryForMap(
                "select name, slug, domain, active from organizations where id = ?",
                UUID.fromString("00000000-0000-4000-8000-000000000001"));

        assertThat(root).containsEntry("name", "77xp").containsEntry("slug", "77xp")
                .containsEntry("active", true);
        assertThat(root.get("domain")).isNull();
    }

    @Test
    void slugIsUnique() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into organizations (name, slug) values ('Outra', '77xp')"))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void domainIsUniqueAndLowercase() {
        String domain = TestData.unique("dominio") + ".exemplo.com";
        TestData.createOrg("Primeira", domain, true);

        assertThatThrownBy(() -> TestData.createOrg("Segunda", domain, true))
                .isInstanceOf(DuplicateKeyException.class);
        assertThatThrownBy(() -> TestData.createOrg("Maiúsculas", "Cliente.Exemplo.com", true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void slugMustBeLowercaseKebabCase() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into organizations (name, slug) values ('Ruim', 'Com Espaço')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void themeDefaultsToEmptyObjectAndOrganizationStartsActive() {
        UUID id = TestData.createOrg("Padrões");

        Map<String, Object> row = ownerJdbc().queryForMap(
                "select theme::text as theme, active from organizations where id = ?", id);
        assertThat(row).containsEntry("theme", "{}").containsEntry("active", true);
    }
}
