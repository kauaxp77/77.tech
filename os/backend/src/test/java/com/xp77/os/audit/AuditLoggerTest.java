package com.xp77.os.audit;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditLoggerTest extends PostgresTestBase {

    @Autowired
    private AuditLogger audit;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void clean() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
    }

    private long count(String entityId) {
        return ownerJdbc().queryForObject("select count(*) from audit_logs where entity_id = ?", Long.class, entityId);
    }

    @Test
    void recordsOrganizationActorTrustedIpAndDevice() {
        UUID org = TestData.createOrg("Auditada");
        UUID actor = UUID.randomUUID();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("User-Agent", "Navegador de teste");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(actor, org, "dono@exemplo.com", "OWNER"), null, List.of()));
        String entity = TestData.unique("registro");

        OrgContext.runAs(org, () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of("key", "valor")));

        assertThat(ownerJdbc().queryForMap("select org_id, actor_user_id, ip, user_agent, result, "
                + "metadata->>'key' as key from audit_logs where entity_id = ?", entity))
                .containsEntry("org_id", org)
                .containsEntry("actor_user_id", actor)
                .containsEntry("ip", "203.0.113.5")
                .containsEntry("user_agent", "Navegador de teste")
                .containsEntry("result", "SUCCESS")
                .containsEntry("key", "valor");
    }

    @Test
    void survivesTheRollbackOfTheCallersTransaction() {
        String entity = TestData.unique("rollback");

        OrgContext.runAs(RootOrganization.ID, () -> new TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> {
                    audit.recordResult(null, "LOGIN_FAILED", "User", entity, Map.of(), false);
                    status.setRollbackOnly();
                }));

        assertThat(count(entity)).isEqualTo(1L);
    }

    @Test
    void withoutOrganizationTheEntryIsDroppedQuietly() {
        String entity = TestData.unique("sem-org");

        assertThatCode(() -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of())).doesNotThrowAnyException();
        assertThat(count(entity)).isZero();
    }

    @Test
    void aFailureToWriteNeverReachesTheCaller() {
        String entity = TestData.unique("falha");

        assertThatCode(() -> OrgContext.runAs(RootOrganization.ID,
                () -> audit.record(null, "Teste", entity, Map.of()))).doesNotThrowAnyException();
        assertThat(count(entity)).isZero();
    }

    @Test
    void theApplicationCannotChangeOrDeleteAuditEntries() {
        String entity = TestData.unique("imutavel");
        OrgContext.runAs(RootOrganization.ID, () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of()));
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> OrgContext.runAs(RootOrganization.ID, () -> tx.executeWithoutResult(status ->
                jdbc.update("update audit_logs set action = 'ALTERADA' where entity_id = ?", entity))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("permission denied");
        assertThatThrownBy(() -> OrgContext.runAs(RootOrganization.ID, () -> tx.executeWithoutResult(status ->
                jdbc.update("delete from audit_logs where entity_id = ?", entity))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("permission denied");
        assertThat(count(entity)).isEqualTo(1L);
    }
}
