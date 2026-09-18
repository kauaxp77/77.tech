package com.xp77.os.config;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** V4: o papel da aplicação não escapa do RLS e não é dono de nada. */
class AppRoleSchemaTest extends PostgresTestBase {

    private boolean appRoleHas(String table, String privilege) {
        return ownerJdbc().queryForObject("select has_table_privilege('app_77xp', ?, ?)",
                Boolean.class, "public." + table, privilege);
    }

    @Test
    void appRoleLogsInButCannotBypassRowLevelSecurity() {
        Map<String, Object> role = ownerJdbc().queryForMap(
                "select rolsuper, rolbypassrls, rolcanlogin from pg_roles where rolname = 'app_77xp'");

        assertThat(role).containsEntry("rolsuper", false)
                .containsEntry("rolbypassrls", false)
                .containsEntry("rolcanlogin", true);
    }

    @Test
    void appRoleOwnsNoTable() {
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_tables where schemaname = 'public' and tableowner = 'app_77xp'",
                Long.class)).isZero();
    }

    @Test
    void membershipsHasForcedRowLevelSecurityWithOnePolicy() {
        Map<String, Object> flags = ownerJdbc().queryForMap(
                "select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.memberships'::regclass");

        assertThat(flags).containsEntry("relrowsecurity", true).containsEntry("relforcerowsecurity", true);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_policies where tablename = 'memberships'", Long.class)).isEqualTo(1L);
    }

    @Test
    void globalTablesHaveNoRowLevelSecurity() {
        assertThat(ownerJdbc().queryForList(
                "select relname from pg_class where relname in ('users', 'organizations') and relrowsecurity",
                String.class)).isEmpty();
    }

    @Test
    void appRoleCanReadAndWriteApplicationTables() {
        for (String table : List.of("organizations", "users", "memberships")) {
            for (String privilege : List.of("SELECT", "INSERT", "UPDATE", "DELETE")) {
                assertThat(appRoleHas(table, privilege)).as(privilege + " em " + table).isTrue();
            }
        }
    }

    @Test
    void appRoleCannotTouchFlywayHistory() {
        for (String privilege : List.of("SELECT", "INSERT", "UPDATE", "DELETE")) {
            assertThat(appRoleHas("flyway_schema_history", privilege)).as(privilege).isFalse();
        }
    }

    @Test
    void tablesCreatedByLaterMigrationsAreGrantedAutomatically() {
        String table = "zz_probe_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        ownerJdbc().execute("create table " + table + " (id int)");
        try {
            assertThat(appRoleHas(table, "INSERT")).isTrue();
        } finally {
            ownerJdbc().execute("drop table " + table);
        }
    }
}
