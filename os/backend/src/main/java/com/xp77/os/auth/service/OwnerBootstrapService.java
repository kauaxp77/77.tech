package com.xp77.os.auth.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Garante o dono (OWNER) da organização 77xp. Idempotente: cria a pessoa e manda o
 * e-mail de primeiro acesso só na primeira vez; nas próximas subidas só confirma o
 * vínculo. Se o link vencer, o dono usa "esqueci minha senha". Precisa de
 * OrgContext = raiz (quem chama é o OwnerBootstrapRunner).
 */
@Service
public class OwnerBootstrapService {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final FirstAccessTokens firstAccess;
    private final EmailService emails;

    public OwnerBootstrapService(UserDirectory users, MembershipDirectory memberships,
                                 FirstAccessTokens firstAccess, EmailService emails) {
        this.users = users;
        this.memberships = memberships;
        this.firstAccess = firstAccess;
        this.emails = emails;
    }

    /** @return true se a pessoa acabou de ser criada. */
    @Transactional
    public boolean ensureOwner(String email) {
        Optional<UserAccount> existing = users.findByEmail(email);
        UserAccount owner = existing.orElseGet(() -> users.createWithoutPassword(email, null));
        memberships.grant(owner.id(), RootOrganization.ID, MembershipRole.OWNER);
        if (existing.isPresent()) {
            return false;
        }
        FirstAccessTokens.Issued link = firstAccess.issueFor(owner.id());
        emails.enqueue(owner.email(), EmailService.Templates.PRIMEIRO_ACESSO,
                Map.of("token", link.token(), "validityHours", link.validityHours()),
                "primeiro-acesso:" + owner.id());
        return true;
    }
}
