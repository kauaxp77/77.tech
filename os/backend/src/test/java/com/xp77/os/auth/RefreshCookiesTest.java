package com.xp77.os.auth;

import com.xp77.os.auth.service.RefreshCookies;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCookiesTest {

    @Test
    void issuedCookieIsHttpOnlySecureLaxAndScopedToAuthRoutes() {
        ResponseCookie cookie = new RefreshCookies(true, "Lax", 30).issue("valor");

        assertThat(cookie.getName()).isEqualTo("xp_refresh");
        assertThat(cookie.getValue()).isEqualTo("valor");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(30));
    }

    @Test
    void clearingExpiresTheCookieImmediately() {
        ResponseCookie cookie = new RefreshCookies(false, "Lax", 30).clear();

        assertThat(cookie.getName()).isEqualTo("xp_refresh");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge()).isZero();
        assertThat(cookie.isSecure()).isFalse();
    }
}
