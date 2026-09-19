package com.xp77.os.auth.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrapService.class);

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
            // grant não muda o papel de um vínculo que já existe (é idempotente de propósito).
            // Se a conta já estava na 77xp como outra coisa, a organização fica SEM dono, e
            // isso não pode passar em silêncio: alguém precisa promover o vínculo à mão.
            memberships.findMember(owner.id(), RootOrganization.ID)
                    .filter(member -> member.role() != MembershipRole.OWNER)
                    .ifPresent(member -> log.warn("BOOTSTRAP_OWNER_EMAIL aponta para uma conta que já existe"
                            + " na 77xp como {}; o vínculo NÃO foi promovido e a organização segue sem dono.",
                            member.role()));
            return false;
        }
        FirstAccessTokens.Issued link = firstAccess.issueFor(owner.id());
        emails.enqueue(owner.email(), EmailService.Templates.PRIMEIRO_ACESSO,
                Map.of("token", link.token(), "validityHours", link.validityHours()),
                "primeiro-acesso:" + owner.id());
        return true;
    }
}
