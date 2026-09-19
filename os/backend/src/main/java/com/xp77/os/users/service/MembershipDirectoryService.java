package com.xp77.os.users.service;

import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.entity.User;
import com.xp77.os.users.repository.MembershipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MembershipDirectoryService implements MembershipDirectory {

    private final MembershipRepository memberships;

    public MembershipDirectoryService(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MembershipRole> activeRoleOf(UUID userId, UUID orgId) {
        return memberships.findByUserIdAndOrgId(userId, orgId)
                .filter(Membership::isActive)
                .map(Membership::getRole);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MemberSummary> findMember(UUID userId, UUID orgId) {
        return memberships.findMemberWithUser(userId, orgId).stream()
                .map(MembershipDirectoryService::toSummary)
                .findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberSummary> listMembers(UUID orgId) {
        return memberships.findMembersWithUsers(orgId).stream()
                .map(MembershipDirectoryService::toSummary)
                .toList();
    }

    @Override
    @Transactional
    public void grant(UUID userId, UUID orgId, MembershipRole role) {
        if (memberships.findByUserIdAndOrgId(userId, orgId).isEmpty()) {
            memberships.saveAndFlush(new Membership(userId, orgId, role));
        }
    }

    @Override
    @Transactional
    public void block(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.block();
        memberships.saveAndFlush(membership);
    }

    @Override
    @Transactional
    public void unblock(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.unblock();
        memberships.saveAndFlush(membership);
    }

    @Override
    @Transactional
    public void recordLogin(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.recordLogin(Instant.now());
        memberships.saveAndFlush(membership);
    }

    private Membership existing(UUID userId, UUID orgId) {
        return memberships.findByUserIdAndOrgId(userId, orgId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada nesta organização"));
    }

    private static MemberSummary toSummary(Object[] row) {
        Membership membership = (Membership) row[0];
        User user = (User) row[1];
        return new MemberSummary(user.getId(), user.getEmail(), user.getName(), membership.getRole(),
                !membership.isActive(), !user.hasPassword(), membership.getLastLoginAt());
    }
}
