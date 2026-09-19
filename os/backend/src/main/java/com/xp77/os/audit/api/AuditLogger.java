package com.xp77.os.audit.api;

import java.util.Map;
import java.util.UUID;

/**
 * Contrato do módulo audit. Registrar nunca derruba a operação auditada: falha ao gravar
 * é engolida e reportada no log. Dentro de uma requisição, IP e aparelho vêm da própria
 * requisição e, sem autor informado, o autor é quem está logado. O registro vai para a
 * organização do OrgContext.
 */
public interface AuditLogger {

    void record(String action, String entityType, String entityId, Map<String, Object> metadata);

    void recordWithActor(UUID actorId, String action, String entityType, String entityId,
                         Map<String, Object> metadata);

    /** Como recordWithActor, dizendo se deu certo. Tentativa recusada também é rastro. */
    void recordResult(UUID actorId, String action, String entityType, String entityId,
                      Map<String, Object> metadata, boolean success);

    final class Actions {
        public static final String LOGIN = "LOGIN";
        public static final String LOGIN_FAILED = "LOGIN_FAILED";
        public static final String LOGOUT = "LOGOUT";
        public static final String SESSION_REUSE_DETECTED = "SESSION_REUSE_DETECTED";
        public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
        public static final String PASSWORD_RESET = "PASSWORD_RESET";
        /** Escrita em /admin/** registrada automaticamente pelo AdminAuditInterceptor. */
        public static final String ADMIN_ACTION = "ADMIN_ACTION";

        private Actions() {
        }
    }
}
