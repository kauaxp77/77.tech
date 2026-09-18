package com.xp77.os.config;

import com.xp77.os.organizations.api.OrgContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import org.hibernate.Session;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.sql.PreparedStatement;
import java.util.UUID;

/**
 * A metade do RLS que faltava no Beto_Banco: no início de CADA transação informa
 * ao banco a organização corrente (OrgContext), com set_config(..., true) — o valor
 * vale só até o fim da transação e nunca vaza para a próxima que usar a conexão.
 * Sem organização, informa texto vazio, e as políticas não mostram nada.
 */
public class OrgAwareJpaTransactionManager extends JpaTransactionManager {

    static final String SET_ORG_SQL = "select set_config('app.org_id', ?, true)";

    public OrgAwareJpaTransactionManager(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        super.doBegin(transaction, definition);
        String orgId = OrgContext.current().map(UUID::toString).orElse("");
        EntityManagerHolder holder = (EntityManagerHolder)
                TransactionSynchronizationManager.getResource(obtainEntityManagerFactory());
        EntityManager entityManager = holder.getEntityManager();
        try {
            entityManager.unwrap(Session.class).doWork(connection -> {
                try (PreparedStatement statement = connection.prepareStatement(SET_ORG_SQL)) {
                    statement.setString(1, orgId);
                    statement.execute();
                }
            });
        } catch (RuntimeException ex) {
            // Não deixa uma transação meio aberta presa à thread nem a conexão fora do pool.
            EntityTransaction open = entityManager.getTransaction();
            if (open.isActive()) {
                open.rollback();
            }
            doCleanupAfterCompletion(transaction);
            throw new CannotCreateTransactionException(
                    "Não foi possível informar a organização ao banco", ex);
        }
    }
}
