package com.xp77.os.users.api;

import java.util.Optional;
import java.util.UUID;

/** Única porta de outros módulos para a identidade global (tabela users, sem RLS). */
public interface UserDirectory {

    Optional<UserAccount> findActiveById(UUID id);

    Optional<UserAccount> findActiveByEmail(String email);

    /** Qualquer situação (inclusive bloqueada). */
    Optional<UserAccount> findByEmail(String email);

    /**
     * Confere a senha de uma pessoa ativa. Hash em algoritmo antigo é promovido para
     * o atual aqui dentro, porque só este módulo conhece o formato do hash.
     */
    Optional<UserAccount> verifyCredentials(String email, String password);

    /** Pessoa sem senha: ela cria a senha pelo link de primeiro acesso. name pode ser nulo. */
    UserAccount createWithoutPassword(String email, String name);

    void setPassword(UUID userId, String newPassword);
}
