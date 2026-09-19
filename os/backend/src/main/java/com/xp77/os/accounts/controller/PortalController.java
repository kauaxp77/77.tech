package com.xp77.os.accounts.controller;

import com.xp77.os.accounts.dto.PortalMeResponse;
import com.xp77.os.organizations.api.OrganizationDirectory;
import com.xp77.os.organizations.api.OrganizationSummary;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Área do cliente (só CLIENT, pela SecurityConfig). O conteúdo chega com cada módulo. */
@RestController
@RequestMapping("/portal")
public class PortalController {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final OrganizationDirectory organizations;

    public PortalController(UserDirectory users, MembershipDirectory memberships,
                            OrganizationDirectory organizations) {
        this.users = users;
        this.memberships = memberships;
        this.organizations = organizations;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PortalMeResponse>> me(@AuthenticationPrincipal AuthenticatedUser client) {
        if (memberships.activeRoleOf(client.userId(), client.orgId()).isEmpty()) {
            throw invalidSession();
        }
        UserAccount account = users.findActiveById(client.userId()).orElseThrow(PortalController::invalidSession);
        String organization = organizations.find(client.orgId()).map(OrganizationSummary::name).orElse("");
        return ResponseEntity.ok(ApiResponse.ok(new PortalMeResponse(account.name(), account.email(), organization)));
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, "Sessão inválida ou expirada");
    }
}
