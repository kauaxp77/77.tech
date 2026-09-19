package com.xp77.os.auth.dto;

/** Só o access token vai no JSON; o refresh token viaja apenas no cookie HttpOnly. */
public record TokenResponse(String accessToken, long expiresIn, String tokenType) {

    public static TokenResponse bearer(String accessToken, long expiresIn) {
        return new TokenResponse(accessToken, expiresIn, "Bearer");
    }
}
