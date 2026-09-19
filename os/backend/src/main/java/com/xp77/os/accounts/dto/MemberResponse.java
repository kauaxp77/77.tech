package com.xp77.os.accounts.dto;

import com.xp77.os.users.api.MemberSummary;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma conta de acesso na tela "Contas de acesso".
 *
 * @param status PENDING (aguardando primeiro acesso), ACTIVE ou BLOCKED
 */
public record MemberResponse(UUID id, String email, String name, String role, String status, Instant lastLoginAt) {

    public static final String PENDING = "PENDING";
    public static final String ACTIVE = "ACTIVE";
    public static final String BLOCKED = "BLOCKED";

    public static MemberResponse from(MemberSummary member) {
        String status = member.blocked() ? BLOCKED : member.awaitingFirstAccess() ? PENDING : ACTIVE;
        return new MemberResponse(member.userId(), member.email(), member.name(), member.role().name(), status,
                member.lastLoginAt());
    }
}
