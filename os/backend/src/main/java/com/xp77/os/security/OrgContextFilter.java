package com.xp77.os.security;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.OrgResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Define a organização da requisição. Roda logo depois da cadeia do Spring Security
 * (que já autenticou pelo JWT): com token, vale a claim org; sem token (rotas
 * públicas), o domínio da requisição, com a 77xp como padrão.
 */
@Component
@Order(SecurityProperties.DEFAULT_FILTER_ORDER + 10)
public class OrgContextFilter extends OncePerRequestFilter {

    private final OrgResolver resolver;

    public OrgContextFilter(OrgResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        OrgContext.set(organizationOf(request));
        try {
            chain.doFilter(request, response);
        } finally {
            OrgContext.clear();
        }
    }

    private UUID organizationOf(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.orgId();
        }
        return resolver.resolve(request.getServerName());
    }
}
