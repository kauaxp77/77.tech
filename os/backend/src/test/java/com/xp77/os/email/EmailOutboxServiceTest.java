package com.xp77.os.email;

import com.xp77.os.email.api.EmailService;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailOutboxServiceTest extends PostgresTestBase {

    @Autowired
    private EmailService emails;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void enqueueStoresAPendingMessageForTheCurrentOrganization() {
        UUID org = TestData.createOrg("Fila");
        String key = TestData.unique("fila");

        boolean enqueued = OrgContext.callAs(org, () -> emails.enqueue("pessoa@exemplo.com",
                EmailService.Templates.REDEFINIR_SENHA, Map.of("token", "t-1", "validityHours", 1), key));

        assertThat(enqueued).isTrue();
        Map<String, Object> row = ownerJdbc().queryForMap("select org_id, to_address, template, status, attempts, "
                + "payload->>'token' as token from email_outbox where dedup_key = ?", key);
        assertThat(row).containsEntry("org_id", org)
                .containsEntry("to_address", "pessoa@exemplo.com")
                .containsEntry("template", "REDEFINIR_SENHA")
                .containsEntry("status", "PENDING")
                .containsEntry("attempts", 0)
                .containsEntry("token", "t-1");
    }

    @Test
    void sameDedupKeyIsIgnoredWithoutBreakingTheCallersTransaction() {
        String key = TestData.unique("dedup");

        List<Boolean> results = OrgContext.callAs(RootOrganization.ID, () ->
                new TransactionTemplate(transactionManager).execute(status -> List.of(
                        emails.enqueue("a@exemplo.com", EmailService.Templates.PRIMEIRO_ACESSO,
                                Map.of("token", "1", "validityHours", 72), key),
                        emails.enqueue("a@exemplo.com", EmailService.Templates.PRIMEIRO_ACESSO,
                                Map.of("token", "2", "validityHours", 72), key))));

        assertThat(results).containsExactly(true, false);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where dedup_key = ?", Long.class, key)).isEqualTo(1L);
    }

    @Test
    void enqueueWithoutOrganizationIsRefused() {
        assertThatThrownBy(() -> emails.enqueue("a@exemplo.com", EmailService.Templates.REDEFINIR_SENHA,
                Map.of(), TestData.unique("sem-org")))
                .isInstanceOf(IllegalStateException.class);
    }
}
