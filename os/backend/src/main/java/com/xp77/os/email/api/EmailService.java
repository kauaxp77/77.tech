package com.xp77.os.email.api;

import java.util.Map;

/**
 * Contrato do módulo email. Enfileirar NÃO envia: grava na fila e volta. E-mail
 * enviado não tem rollback; por isso o envio acontece depois, fora da transação
 * de quem pediu. Exige OrgContext (a mensagem guarda a organização).
 */
public interface EmailService {

    /** @return true se enfileirou agora; false se a dedupKey já existia. */
    boolean enqueue(String to, String template, Map<String, Object> data, String dedupKey);

    /** Templates conhecidos. O texto de cada um vive em EmailTemplates. */
    final class Templates {
        public static final String PRIMEIRO_ACESSO = "PRIMEIRO_ACESSO";
        public static final String REDEFINIR_SENHA = "REDEFINIR_SENHA";

        private Templates() {
        }
    }
}
