package com.xp77.os.users.service;

import com.xp77.os.config.PasswordEncoderConfig;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import com.xp77.os.users.entity.User;
import com.xp77.os.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserDirectoryService implements UserDirectory {

    private static final Logger log = LoggerFactory.getLogger(UserDirectoryService.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserDirectoryService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveById(UUID id) {
        return users.findById(id).filter(User::isActive).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveByEmail(String email) {
        return users.findByEmail(normalize(email)).filter(User::isActive).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findByEmail(String email) {
        return users.findByEmail(normalize(email)).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional
    public Optional<UserAccount> verifyCredentials(String email, String password) {
        Optional<User> found = users.findByEmail(normalize(email));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        User user = found.get();
        if (!user.isActive() || !user.hasPassword() || password == null
                || !encoder.matches(password, user.getPasswordHash())) {
            return Optional.empty();
        }
        promoteHashIfNeeded(user, password);
        return Optional.of(toAccount(user));
    }

    @Override
    @Transactional
    public UserAccount createWithoutPassword(String email, String name) {
        String normalized = normalize(email);
        if (users.existsByEmail(normalized)) {
            throw new BusinessException(ErrorCode.CONFLICT, "E-mail já cadastrado");
        }
        String cleanName = name == null || name.isBlank() ? null : name.trim();
        return toAccount(users.saveAndFlush(new User(normalized, cleanName, null)));
    }

    @Override
    @Transactional
    public void setPassword(UUID userId, String newPassword) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        user.setPasswordHash(encoder.encode(newPassword));
        users.saveAndFlush(user);
    }

    /** No primeiro login de um hash antigo, a senha é regravada no algoritmo atual. */
    private void promoteHashIfNeeded(User user, String password) {
        if (!user.getPasswordHash().startsWith(PasswordEncoderConfig.CURRENT_PREFIX)) {
            user.setPasswordHash(encoder.encode(password));
            users.saveAndFlush(user);
            log.info("Hash de senha promovido para {} no usuário {}", PasswordEncoderConfig.CURRENT_ID, user.getId());
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static UserAccount toAccount(User user) {
        return new UserAccount(user.getId(), user.getEmail(), user.getName(), user.hasPassword());
    }
}
