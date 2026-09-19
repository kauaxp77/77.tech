package com.xp77.os.auth.api;

import java.util.UUID;

/**
 * Links de primeiro acesso, para quem cria contas (dono inicial e convites). O valor em
 * claro só existe no retorno; no banco fica só o hash. Chame dentro da transação que
 * enfileira o e-mail: ou o link enviado existe no banco, ou nada acontece.
 */
public interface FirstAccessTokens {

    record Issued(String token, long validityHours) {
    }

    /** Novo link (72 h). Os links de primeiro acesso ainda não usados da pessoa deixam de valer. */
    Issued issueFor(UUID userId);
}
