package com.xp77.os.support;

import java.util.UUID;

/**
 * Cria dados de teste direto no banco, como o dono (ignora RLS e permissões).
 * Valores únicos por chamada: todas as classes de teste dividem o mesmo banco.
 */
public final class TestData {

    private TestData() {
    }

    public static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public static String uniqueEmail(String prefix) {
        return unique(prefix) + "@teste.77xp.dev";
    }

    public static UUID createOrg(String name) {
        return createOrg(name, null, true);
    }

    public static UUID createOrg(String name, String domain, boolean active) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into organizations (name, slug, domain, active) values (?, ?, ?, ?) returning id",
                UUID.class, name, unique("org"), domain, active);
    }

    public static UUID createUser(String email, String passwordHash) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into users (email, password_hash) values (?, ?) returning id",
                UUID.class, email, passwordHash);
    }

    public static UUID addMembership(UUID userId, UUID orgId, String role) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into memberships (user_id, org_id, role) values (?, ?, ?) returning id",
                UUID.class, userId, orgId, role);
    }
}
