package com.xp77.os.organizations.api;

import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Organização da requisição (ou do processo) corrente.
 *
 * <p>Quem preenche: o OrgContextFilter em toda requisição (claim org do token ou,
 * em rota pública, o domínio) e {@link #callAs} em processos sem requisição.
 * Quem lê: o OrgAwareJpaTransactionManager, que informa app.org_id ao banco no
 * INÍCIO de cada transação. Trocar a organização com uma transação aberta não
 * teria efeito, então {@link #callAs} recusa em vez de falhar calado.
 *
 * <p>Diferente do TenantContext do Beto_Banco, não existe "raiz por padrão":
 * sem organização definida, o banco não mostra nada.
 */
public final class OrgContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private OrgContext() {
    }

    public static Optional<UUID> current() {
        return Optional.ofNullable(CURRENT.get());
    }

    public static void set(UUID orgId) {
        CURRENT.set(Objects.requireNonNull(orgId, "orgId"));
    }

    /** Obrigatório no fim de toda requisição: a thread volta para o pool. */
    public static void clear() {
        CURRENT.remove();
    }

    public static <T> T callAs(UUID orgId, Supplier<T> action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException(
                    "OrgContext.callAs dentro de uma transação não muda app.org_id; chame fora dela.");
        }
        UUID previous = CURRENT.get();
        set(orgId);
        try {
            return action.get();
        } finally {
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }

    public static void runAs(UUID orgId, Runnable action) {
        callAs(orgId, () -> {
            action.run();
            return null;
        });
    }
}
