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
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * 401 da cadeia de segurança. Acontece fora do Spring MVC, então o
 * GlobalExceptionHandler não a alcança: o envelope é escrito aqui, no mesmo
 * formato, para o cliente nunca receber dois formatos de erro diferentes.
 */
@Component
public class EnvelopeAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper json;

    public EnvelopeAuthenticationEntryPoint(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        response.setStatus(ErrorCode.UNAUTHORIZED.httpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), ApiResponse.error(new ErrorPayload(
                ErrorCode.UNAUTHORIZED.name(),
                "Não autenticado",
                ErrorCode.UNAUTHORIZED.httpStatus(),
                request.getRequestURI(),
                MDC.get(TraceIdFilter.MDC_KEY),
                Instant.now().toString(),
                List.of())));
    }
}
