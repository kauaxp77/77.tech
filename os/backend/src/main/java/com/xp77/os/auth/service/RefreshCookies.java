package com.xp77.os.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cookie do refresh token. HttpOnly: JavaScript nunca lê o valor (XSS não rouba a
 * sessão longa). Path /api/v1/auth: o navegador só o manda às rotas de login.
 * SameSite=Lax funciona porque tela e API ficam no mesmo site (rewrite da Vercel).
 */
@Component
public class RefreshCookies {

    public static final String NAME = "xp_refresh";
    public static final String PATH = "/api/v1/auth";

    private final boolean secure;
    private final String sameSite;
    private final Duration maxAge;

    public RefreshCookies(@Value("${xp77.auth.cookie-secure}") boolean secure,
                          @Value("${xp77.auth.cookie-same-site}") String sameSite,
                          @Value("${xp77.auth.refresh-token-days}") long days) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAge = Duration.ofDays(days);
    }

    public ResponseCookie issue(String value) {
        return builder(value).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return builder("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite(sameSite).path(PATH);
    }
}
