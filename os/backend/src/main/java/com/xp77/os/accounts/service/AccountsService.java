package com.xp77.os.accounts.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.api.SessionRevocation;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Contas de acesso (D10): convite, lista, reenvio, bloqueio e desbloqueio, sempre na
 * organização de quem age (claim org do token, já no OrgContext). Cada operação é uma
 * transação só: pessoa, vínculo, link e e-mail nascem juntos ou nada acontece.
 */
@Service
public class AccountsService {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final FirstAccessTokens firstAccess;
    private final SessionRevocation sessions;
    private final EmailService emails;

    public AccountsService(UserDirectory users, MembershipDirectory memberships, FirstAccessTokens firstAccess,
                           SessionRevocation sessions, EmailService emails) {
        this.users = users;
        this.memberships = memberships;
        this.firstAccess = firstAccess;
        this.sessions = sessions;
        this.emails = emails;
    }

    @Transactional
    public MemberSummary invite(AuthenticatedUser actor, String email, String name, MembershipRole role) {
        ensureMayManage(actor, role);
        UUID orgId = actor.orgId();
        Optional<UserAccount> existing = users.findByEmail(email);
        if (existing.isPresent() && memberships.findMember(existing.get().id(), orgId).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Este e-mail já tem acesso nesta organização.");
        }
        UserAccount person = existing.orElseGet(() -> users.createWithoutPassword(email, name));
        memberships.grant(person.id(), orgId, role);
        sendInvitation(person, role, person.name() != null ? person.name() : name);
        return memberships.findMember(person.id(), orgId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<MemberSummary> list(AuthenticatedUser actor) {
        return memberships.listMembers(actor.orgId());
    }

    /** Reenvia o convite. Se a pessoa ainda não tem senha, o link anterior deixa de valer. */
    @Transactional
    public void resendInvitation(AuthenticatedUser actor, UUID userId) {
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        sendInvitation(new UserAccount(member.userId(), member.email(), member.name(), !member.awaitingFirstAccess()),
                member.role(), member.name());
    }

    /**
     * Bloqueia nesta organização e derruba na hora as sessões dela AQUI. Se a pessoa
     * também tem conta em outra organização, aquelas sessões continuam: o bloqueio vale
     * para o vínculo, não para a pessoa no sistema todo.
     */
    @Transactional
    public void block(AuthenticatedUser actor, UUID userId) {
        if (actor.userId().equals(userId)) {
            throw forbidden("Você não pode bloquear a própria conta.");
        }
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        memberships.block(userId, actor.orgId());
        sessions.revokeSessionsInOrganization(userId, actor.orgId());
    }

    @Transactional
    public void unblock(AuthenticatedUser actor, UUID userId) {
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        memberships.unblock(userId, actor.orgId());
    }

    private MemberSummary memberOf(AuthenticatedUser actor, UUID userId) {
        return memberships.findMember(userId, actor.orgId())
                .orElseThrow(() -> new NotFoundException("Conta não encontrada nesta organização"));
    }

    /** Ninguém mexe no OWNER por aqui; ADMIN só pelo OWNER; o ADMIN cuida de TEAM e CLIENT. */
    private static void ensureMayManage(AuthenticatedUser actor, MembershipRole target) {
        if (target == MembershipRole.OWNER) {
            throw forbidden("A conta do dono não pode ser convidada nem alterada por aqui.");
        }
        if (target == MembershipRole.ADMIN && !MembershipRole.OWNER.name().equals(actor.role())) {
            throw forbidden("Só o dono pode convidar ou alterar um administrador.");
        }
    }

    private void sendInvitation(UserAccount person, MembershipRole role, String greetingName) {
        Map<String, Object> data = new HashMap<>();
        data.put("role", role.name());
        if (greetingName != null && !greetingName.isBlank()) {
            data.put("name", greetingName);
        }
        if (!person.hasPassword()) {
            FirstAccessTokens.Issued link = firstAccess.issueFor(person.id());
            data.put("token", link.token());
            data.put("validityHours", link.validityHours());
        }
        // Cada convite é uma mensagem nova (reenviar manda outro e-mail).
        emails.enqueue(person.email(), EmailService.Templates.CONVITE, data,
                "convite:" + person.id() + ":" + UUID.randomUUID());
    }

    private static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCode.FORBIDDEN, message);
    }
}
