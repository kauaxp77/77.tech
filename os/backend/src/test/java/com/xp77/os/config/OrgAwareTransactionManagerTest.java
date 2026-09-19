package com.xp77.os.config;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgAwareTransactionManagerTest extends PostgresTestBase {

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    private String orgSeenByDatabase(boolean readOnly) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setReadOnly(readOnly);
        return tx.execute(status ->
                jdbc.queryForObject("select current_setting('app.org_id', true)", String.class));
    }

    @Test
    void applicationUsesTheOrgAwareTransactionManager() {
        assertThat(transactionManager).isInstanceOf(OrgAwareJpaTransactionManager.class);
    }

    @Test
    void everyTransactionTellsTheDatabaseTheCurrentOrganization() {
        UUID org = UUID.randomUUID();

        assertThat(OrgContext.callAs(org, () -> orgSeenByDatabase(false))).isEqualTo(org.toString());
    }

    @Test
    void readOnlyTransactionsAlsoReceiveTheOrganization() {
        UUID org = UUID.randomUUID();

        assertThat(OrgContext.callAs(org, () -> orgSeenByDatabase(true))).isEqualTo(org.toString());
    }

    @Test
    void withoutOrganizationTheSettingIsEmpty() {
        assertThat(orgSeenByDatabase(false)).isEmpty();
    }

    @Test
    void callAsInsideAnOpenTransactionIsRejected() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> tx.executeWithoutResult(status ->
                OrgContext.callAs(UUID.randomUUID(), () -> 1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dentro de uma transação");
    }
}
