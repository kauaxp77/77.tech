package com.xp77.os.audit.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.xp77.os.audit.entity.AuditLog;

import java.time.Instant;
import java.util.UUID;

/** Um registro da auditoria. actorUserId nulo = ação do sistema; metadata sai como JSON. */
public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String action,
        String entityType,
        String entityId,
        @JsonRawValue String metadata,
        String ip,
        String userAgent,
        String result,
        Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getAction(), log.getEntityType(),
                log.getEntityId(), log.getMetadata(), log.getIp(), log.getUserAgent(), log.getResult(),
                log.getCreatedAt());
    }
}
