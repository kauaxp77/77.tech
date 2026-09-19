package com.xp77.os.users.api;

/**
 * Tipo de conta de uma pessoa numa organização. Existe só no servidor (memberships.role).
 * OWNER, ADMIN e TEAM usam o painel; CLIENT usa só a Área do cliente.
 */
public enum MembershipRole {
    OWNER,
    ADMIN,
    TEAM,
    CLIENT
}
