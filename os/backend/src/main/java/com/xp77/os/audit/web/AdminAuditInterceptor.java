package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.audit.service.AuditLoggerImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.WebUtils;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Registra toda alteração feita no painel (/admin/**), com quem fez, as de hoje e as
 * que forem criadas depois. Ação que já gravou um registro próprio não ganha um segundo
 * genérico. Tentativa recusada (status >= 400) também é registrada, como falha.
 */
@Component
public class AdminAuditInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminAuditInterceptor.class);

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final AuditLogger audit;
    private final ObjectMapper mapper;

    public AdminAuditInterceptor(AuditLogger audit, ObjectMapper mapper) {
        this.audit = audit;
        this.mapper = mapper;
    }

    static boolean isWrite(String method) {
        return method != null && WRITE_METHODS.contains(method);
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        try {
            if (!isWrite(request.getMethod())
                    || Boolean.TRUE.equals(request.getAttribute(AuditLoggerImpl.RECORDED_IN_THIS_REQUEST))
                    || !(request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE) instanceof String route)
                    || !route.startsWith("/admin/")) {
                return;
            }

            @SuppressWarnings("unchecked")
            Map<String, String> variables = (Map<String, String>)
                    request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

            int status = response.getStatus();
            if (ex != null && status < 400) {
                status = 500;
            }

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("method", request.getMethod());
            details.put("route", route);
            details.put("status", status);
            if (variables != null && !variables.isEmpty()) {
                details.put("params", variables);
            }
            body(request).ifPresent(summary -> details.put("body", summary));

            String[] entity = entityOf(route, variables);
            audit.recordResult(null, AuditLogger.Actions.ADMIN_ACTION, entity[0], entity[1], details, status < 400);
        } catch (RuntimeException e) {
            log.error("Falha ao registrar a alteração do painel {} {}", request.getMethod(), request.getRequestURI(), e);
        }
    }

    private Optional<Object> body(HttpServletRequest request) {
        ContentCachingRequestWrapper copy = WebUtils.getNativeRequest(request, ContentCachingRequestWrapper.class);
        if (copy == null) {
            return Optional.empty();
        }
        byte[] read = copy.getContentAsByteArray();
        boolean truncated = read.length >= AdminRequestBodyCachingFilter.MAX_BODY
                || request.getContentLengthLong() > read.length;
        return RequestBodySummary.of(read, truncated, mapper);
    }

    /**
     * O que foi alterado, tirado da rota: o identificador é a última variável cujo nome
     * termina em "id", e o tipo é o trecho antes dela. Sem variável de id, o tipo é o
     * último trecho fixo da rota.
     */
    static String[] entityOf(String route, Map<String, String> variables) {
        String[] parts = route.split("/");
        for (int i = parts.length - 1; i >= 0; i--) {
            String part = parts[i];
            if (part.startsWith("{") && part.endsWith("}")) {
                String name = part.substring(1, part.length() - 1);
                if (!name.toLowerCase(Locale.ROOT).endsWith("id")) {
                    continue;
                }
                String type = i > 0 && !parts[i - 1].startsWith("{") ? parts[i - 1] : name;
                String value = variables == null ? null : variables.get(name);
                return new String[] {type, value};
            }
        }
        String lastFixed = "";
        for (String part : parts) {
            if (!part.isEmpty() && !part.startsWith("{")) {
                lastFixed = part;
            }
        }
        return new String[] {lastFixed.isEmpty() ? route : lastFixed, null};
    }
}
