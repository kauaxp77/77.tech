package com.xp77.os.audit.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.util.Locale;

/**
 * Guarda uma cópia do corpo das alterações do painel (só JSON, só escrita): o corpo só
 * pode ser lido uma vez, por quem trata a rota, e o AdminAuditInterceptor lê a cópia depois.
 */
@Component
public class AdminRequestBodyCachingFilter extends OncePerRequestFilter {

    /** Acima disso o corpo não é guardado inteiro, e o registro avisa que cortou. */
    static final int MAX_BODY = 64 * 1024;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String type = request.getContentType();
        return !AdminAuditInterceptor.isWrite(request.getMethod())
                || !request.getRequestURI().contains("/admin/")
                || type == null
                || !type.toLowerCase(Locale.ROOT).contains("json");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        chain.doFilter(new ContentCachingRequestWrapper(request, MAX_BODY), response);
    }
}
