package com.xp77.os.users;

import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.UserDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;

/**
 * Responder a mesma mensagem para e-mail certo e errado não basta: se o e-mail que não
 * existe volta na hora e o que existe só depois do Argon2, o tempo entrega quais contas
 * existem. Por isso o caminho "não encontrei" também confere um hash.
 */
class CredentialTimingTest extends PostgresTestBase {

    @Autowired
    private UserDirectory users;

    @MockitoSpyBean
    private PasswordEncoder encoder;

    @Test
    void anUnknownEmailStillPaysForAPasswordCheck() {
        assertThat(users.verifyCredentials(TestData.uniqueEmail("nao-existe"), "qualquer-senha")).isEmpty();

        verify(encoder).matches(any(), anyString());
    }
}
