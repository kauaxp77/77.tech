package com.xp77.os.auth.controller;

import com.xp77.os.auth.dto.ChangePasswordRequest;
import com.xp77.os.auth.dto.LoginRequest;
import com.xp77.os.auth.dto.MeResponse;
import com.xp77.os.auth.dto.TokenResponse;
import com.xp77.os.auth.service.AuthService;
import com.xp77.os.auth.service.AuthService.IssuedTokens;
import com.xp77.os.auth.service.RefreshCookies;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.ClientIpResolver;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.users.api.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;
    private final RefreshCookies cookies;
    private final ClientIpResolver clientIp;

    public AuthController(AuthService auth, RefreshCookies cookies, ClientIpResolver clientIp) {
        this.auth = auth;
        this.cookies = cookies;
        this.clientIp = clientIp;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request,
                                                            HttpServletRequest http) {
        return withSession(auth.login(request.email(), request.password(), originOf(http)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(value = RefreshCookies.NAME, required = false) String refresh,
            HttpServletRequest http) {
        return withSession(auth.refresh(refresh, originOf(http)));
    }

    /** Sempre 204 e cookie limpo: responder 404 revelaria quais tokens existem. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = RefreshCookies.NAME, required = false) String refresh) {
        auth.logout(refresh);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MeResponse>> me(@AuthenticationPrincipal AuthenticatedUser user) {
        UserAccount account = auth.currentAccount(user);
        return ResponseEntity.ok(ApiResponse.ok(new MeResponse(
                account.id(), account.email(), account.name(), user.orgId(), user.role())));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser user,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        auth.changePassword(user, request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    private ResponseEntity<ApiResponse<TokenResponse>> withSession(IssuedTokens tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(tokens.refreshToken()).toString())
                .body(ApiResponse.ok(TokenResponse.bearer(tokens.accessToken(), tokens.expiresInSeconds())));
    }

    private Origin originOf(HttpServletRequest request) {
        return new Origin(clientIp.resolve(request), request.getHeader(HttpHeaders.USER_AGENT));
    }
}
