package com.xp77.os.users;

import com.xp77.os.config.PasswordEncoderConfig;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserDirectoryServiceTest extends PostgresTestBase {

    private static final String PASSWORD = "senha-forte-123";

    @Autowired
    private UserDirectory users;

    private String newUserWithPassword(String prefix) {
        String email = TestData.uniqueEmail(prefix);
        TestData.createUser(email, TestData.hash(PASSWORD));
        return email;
    }

    private String storedHashOf(String email) {
        return ownerJdbc().queryForObject("select password_hash from users where email = ?", String.class, email);
    }

    @Test
    void verifyCredentialsAcceptsTheRightPasswordIgnoringEmailCaseAndSpaces() {
        String email = newUserWithPassword("certo");

        Optional<UserAccount> account = users.verifyCredentials("  " + email.toUpperCase() + " ", PASSWORD);

        assertThat(account).isPresent();
        assertThat(account.get().email()).isEqualTo(email);
        assertThat(account.get().hasPassword()).isTrue();
    }

    @Test
    void verifyCredentialsRejectsWrongPasswordAndUnknownEmail() {
        String email = newUserWithPassword("errado");

        assertThat(users.verifyCredentials(email, "outra-senha")).isEmpty();
        assertThat(users.verifyCredentials(TestData.uniqueEmail("ninguem"), PASSWORD)).isEmpty();
    }

    @Test
    void verifyCredentialsRejectsBlockedUserAndUserWithoutPassword() {
        String blocked = newUserWithPassword("bloqueado");
        ownerJdbc().update("update users set status = 'BLOCKED' where email = ?", blocked);
        String withoutPassword = TestData.uniqueEmail("sem-senha");
        TestData.createUser(withoutPassword, null);

        assertThat(users.verifyCredentials(blocked, PASSWORD)).isEmpty();
        assertThat(users.verifyCredentials(withoutPassword, PASSWORD)).isEmpty();
    }

    @Test
    void legacyBcryptHashIsPromotedToArgon2OnSuccessfulLogin() {
        String email = TestData.uniqueEmail("legado");
        TestData.createUser(email, "{bcrypt}" + new BCryptPasswordEncoder().encode(PASSWORD));

        assertThat(users.verifyCredentials(email, PASSWORD)).isPresent();
        assertThat(storedHashOf(email)).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(users.verifyCredentials(email, PASSWORD)).isPresent();
    }

    @Test
    void activeLookupsIgnoreBlockedUsers() {
        String email = newUserWithPassword("ativo");
        UUID id = users.findActiveByEmail(email).orElseThrow().id();
        assertThat(users.findActiveById(id)).isPresent();

        ownerJdbc().update("update users set status = 'BLOCKED' where id = ?", id);

        assertThat(users.findActiveById(id)).isEmpty();
        assertThat(users.findActiveByEmail(email)).isEmpty();
        assertThat(users.findByEmail(email.toUpperCase())).isPresent();
    }

    @Test
    void createWithoutPasswordStoresNormalizedEmailAndNameAndRejectsDuplicates() {
        String email = TestData.uniqueEmail("novo");

        UserAccount created = users.createWithoutPassword(" " + email.toUpperCase() + " ", "Maria Souza");

        assertThat(created.email()).isEqualTo(email);
        assertThat(created.name()).isEqualTo("Maria Souza");
        assertThat(created.hasPassword()).isFalse();
        assertThat(storedHashOf(email)).isNull();
        assertThatThrownBy(() -> users.createWithoutPassword(email, "Outra"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void setPasswordStoresArgon2HashAndRejectsUnknownUser() {
        UserAccount created = users.createWithoutPassword(TestData.uniqueEmail("define"), null);

        users.setPassword(created.id(), "minha-senha-nova");

        assertThat(storedHashOf(created.email())).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(users.verifyCredentials(created.email(), "minha-senha-nova")).isPresent();
        assertThatThrownBy(() -> users.setPassword(UUID.randomUUID(), "qualquer-coisa"))
                .isInstanceOf(NotFoundException.class);
    }
}
