package com.xp77.os.auth.service;

import com.xp77.os.auth.api.SessionRevocation;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SessionRevocationService implements SessionRevocation {

    private final RefreshTokenService refreshTokens;

    public SessionRevocationService(RefreshTokenService refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    @Override
    public void revokeAllSessions(UUID userId) {
        refreshTokens.revokeAll(userId);
    }

    @Override
    public void revokeSessionsInOrganization(UUID userId, UUID orgId) {
        refreshTokens.revokeAllInOrganization(userId, orgId);
    }
}
