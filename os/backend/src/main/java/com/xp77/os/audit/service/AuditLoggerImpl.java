package com.xp77.os.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.audit.entity.AuditLog;
import com.xp77.os.audit.repository.AuditLogRepository;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuditLoggerImpl implements AuditLogger {

    /** Marca a requisição que já gravou um registro próprio: o automático não repete. */
    public static final String RECORDED_IN_THIS_REQUEST = AuditLoggerImpl.class.getName() + ".recorded";

    private static final int MAX_USER_AGENT = 300;

    private static final Logger log = LoggerFactory.getLogger(AuditLoggerImpl.class);

    private final AuditLogRepository repository;
    private final ObjectMapper mapper;
    private final ClientIpResolver clientIp;
    private final TransactionTemplate ownTransaction;

    public AuditLoggerImpl(AuditLogRepository repository, ObjectMapper mapper, ClientIpResolver clientIp,
                           PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.mapper = mapper;
        this.clientIp = clientIp;
        // Transação própria: o registro de uma falha sobrevive ao rollback de quem chamou,
        // e um erro ao gravar nunca marca a transação de quem chamou para rollback.
        this.ownTransaction = new TransactionTemplate(transactionManager);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void record(String action, String entityType, String entityId, Map<String, Object> metadata) {
        recordResult(null, action, entityType, entityId, metadata, true);
    }

    @Override
    public void recordWithActor(UUID actorId, String action, String entityType, String entityId,
                                Map<String, Object> metadata) {
        recordResult(actorId, action, entityType, entityId, metadata, true);
    }

    @Override
    public void recordResult(UUID actorId, String action, String entityType, String entityId,
                             Map<String, Object> metadata, boolean success) {
        Optional<UUID> orgId = OrgContext.current();
        if (orgId.isEmpty()) {
            log.warn("Auditoria de {} descartada: nenhuma organização no contexto", action);
            return;
        }
        try {
            String json = metadata == null || metadata.isEmpty() ? null : mapper.writeValueAsString(metadata);
            AuditLog entry = new AuditLog(orgId.get(), actorId != null ? actorId : currentUser(), action,
                    entityType, entityId, json, success ? "SUCCESS" : "FAILURE");
            Optional<HttpServletRequest> request = currentRequest();
            request.ifPresent(r -> {
                entry.setIp(clientIp.resolve(r));
                entry.setUserAgent(truncate(r.getHeader("User-Agent")));
            });
            ownTransaction.executeWithoutResult(status -> repository.saveAndFlush(entry));
            request.ifPresent(r -> r.setAttribute(RECORDED_IN_THIS_REQUEST, Boolean.TRUE));
        } catch (Exception e) {
            // Um registro perdido é ruim; uma operação perdida por causa dele seria pior.
            log.error("Falha ao gravar auditoria da ação {} sobre {} {}", action, entityType, entityId, e);
        }
    }

    /** Fora de uma requisição (processos em segundo plano) não há ninguém logado: autor vazio. */
    private static UUID currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user
                ? user.userId()
                : null;
    }

    private static Optional<HttpServletRequest> currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? Optional.of(attributes.getRequest())
                : Optional.empty();
    }

    private static String truncate(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        return userAgent.length() <= MAX_USER_AGENT ? userAgent : userAgent.substring(0, MAX_USER_AGENT);
    }
}
