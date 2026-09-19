package com.xp77.os.security;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgContextFilterTest {

    private final UUID hostOrg = UUID.randomUUID();
    private final OrgContextFilter filter = new OrgContextFilter(
            host -> "cliente.exemplo.com".equals(host) ? hostOrg : RootOrganization.ID);

    @AfterEach
    void clean() {
        SecurityContextHolder.clearContext();
        OrgContext.clear();
    }

    private UUID orgSeenInsideTheChain(MockHttpServletRequest request) throws Exception {
        AtomicReference<UUID> seen = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(),
                (req, res) -> seen.set(OrgContext.current().orElse(null)));
        return seen.get();
    }

    @Test
    void authenticatedRequestUsesTheOrganizationFromTheToken() throws Exception {
        UUID tokenOrg = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), tokenOrg, "dono@exemplo.com", "OWNER");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("cliente.exemplo.com");

        assertThat(orgSeenInsideTheChain(request)).isEqualTo(tokenOrg);
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void publicRequestResolvesTheOrganizationByHost() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("cliente.exemplo.com");

        assertThat(orgSeenInsideTheChain(request)).isEqualTo(hostOrg);
    }

    @Test
    void contextIsClearedEvenWhenTheChainFails() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            throw new ServletException("falhou");
        })).isInstanceOf(ServletException.class);
        assertThat(OrgContext.current()).isEmpty();
    }
}
