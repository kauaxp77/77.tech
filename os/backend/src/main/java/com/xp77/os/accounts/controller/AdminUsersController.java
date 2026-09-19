package com.xp77.os.accounts.controller;

import com.xp77.os.accounts.dto.InvitationRequest;
import com.xp77.os.accounts.dto.MemberResponse;
import com.xp77.os.accounts.service.AccountsService;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Contas de acesso da organização de quem está logado (só OWNER e ADMIN, pela SecurityConfig). */
@RestController
@RequestMapping("/admin/users")
public class AdminUsersController {

    private final AccountsService accounts;

    public AdminUsersController(AccountsService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MemberResponse>>> list(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(ApiResponse.ok(accounts.list(actor).stream().map(MemberResponse::from).toList()));
    }

    @PostMapping("/invitations")
    public ResponseEntity<ApiResponse<MemberResponse>> invite(@AuthenticationPrincipal AuthenticatedUser actor,
                                                              @Valid @RequestBody InvitationRequest request) {
        MemberResponse invited = MemberResponse.from(
                accounts.invite(actor, request.email(), request.name(), request.role()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(invited));
    }

    @PostMapping("/{id}/invitation")
    public ResponseEntity<Void> resendInvitation(@AuthenticationPrincipal AuthenticatedUser actor,
                                                 @PathVariable UUID id) {
        accounts.resendInvitation(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<Void> block(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id) {
        accounts.block(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<Void> unblock(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id) {
        accounts.unblock(actor, id);
        return ResponseEntity.noContent().build();
    }
}
