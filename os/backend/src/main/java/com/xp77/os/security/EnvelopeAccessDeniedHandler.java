package com.xp77.os.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.ErrorPayload;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.shared.trace.TraceIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * 403 da cadeia de segurança (token válido, papel insuficiente). Mesmo motivo do
 * EnvelopeAuthenticationEntryPoint: acontece antes do Spring MVC.
 */
@Component
public class EnvelopeAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper json;

    public EnvelopeAccessDeniedHandler(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        response.setStatus(ErrorCode.FORBIDDEN.httpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), ApiResponse.error(new ErrorPayload(
                ErrorCode.FORBIDDEN.name(),
                "Acesso negado",
                ErrorCode.FORBIDDEN.httpStatus(),
                request.getRequestURI(),
                MDC.get(TraceIdFilter.MDC_KEY),
                Instant.now().toString(),
                List.of())));
    }
}
