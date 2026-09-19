package com.xp77.os.auth.controller;

import com.xp77.os.auth.dto.ForgotPasswordRequest;
import com.xp77.os.auth.dto.SetPasswordRequest;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.service.PasswordResetService;
import com.xp77.os.users.api.UserDirectory;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rotas públicas de senha: esqueci, redefinir (link RESET) e primeiro acesso (link FIRST_ACCESS). */
@RestController
@RequestMapping("/auth")
public class PasswordController {

    private final UserDirectory users;
    private final PasswordResetService resets;

    public PasswordController(UserDirectory users, PasswordResetService resets) {
        this.users = users;
        this.resets = resets;
    }

    /** Resposta idêntica exista o e-mail ou não: qualquer diferença enumeraria contas. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        users.findActiveByEmail(request.email()).ifPresent(resets::requestReset);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody SetPasswordRequest request) {
        resets.redeem(request.token(), TokenPurpose.RESET, request.password());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/first-access")
    public ResponseEntity<Void> firstAccess(@Valid @RequestBody SetPasswordRequest request) {
        resets.redeem(request.token(), TokenPurpose.FIRST_ACCESS, request.password());
        return ResponseEntity.noContent().build();
    }
}
