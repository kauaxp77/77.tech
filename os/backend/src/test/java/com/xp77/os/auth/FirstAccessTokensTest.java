package com.xp77.os.auth;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.service.PasswordResetService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FirstAccessTokensTest extends PostgresTestBase {

    @Autowired
    private FirstAccessTokens firstAccess;

    @Autowired
    private PasswordResetService resets;

    @Test
    void issuingANewLinkInvalidatesThePreviousOne() {
        UUID user = TestData.createUser(TestData.uniqueEmail("convidado"), null);
        String first = firstAccess.issueFor(user).token();

        FirstAccessTokens.Issued second = firstAccess.issueFor(user);

        assertThat(second.validityHours()).isEqualTo(72);
        assertThatThrownBy(() -> resets.redeem(first, TokenPurpose.FIRST_ACCESS, "senha-forte-123"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Link inválido ou expirado");
        resets.redeem(second.token(), TokenPurpose.FIRST_ACCESS, "senha-forte-123");
        assertThat(ownerJdbc().queryForObject(
                "select password_hash from users where id = ?", String.class, user)).startsWith("{argon2}");
    }
}
