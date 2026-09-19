package com.xp77.os.users.api;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Vínculos pessoa × organização. A tabela tem RLS: chame sempre com OrgContext igual
 * a orgId (OrgContext.callAs), senão o banco não mostra nem aceita o vínculo.
 */
public interface MembershipDirectory {

    /** Tipo de conta, só se o vínculo estiver ACTIVE. É o que login e renovação consultam. */
    Optional<MembershipRole> activeRoleOf(UUID userId, UUID orgId);

    Optional<MemberSummary> findMember(UUID userId, UUID orgId);

    /** Contas da organização, em ordem de e-mail. */
    List<MemberSummary> listMembers(UUID orgId);

    /** Cria o vínculo com o tipo informado; se já existir, não muda nada. */
    void grant(UUID userId, UUID orgId, MembershipRole role);

    void block(UUID userId, UUID orgId);

    void unblock(UUID userId, UUID orgId);

    /** Marca o último acesso da pessoa nesta organização. */
    void recordLogin(UUID userId, UUID orgId);
}
