package com.xp77.os.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordEncoderConfigTest {

    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();

    @Test
    void newPasswordsAreEncodedWithArgon2() {
        String hash = encoder.encode("senha-forte-123");

        assertThat(hash).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(encoder.matches("senha-forte-123", hash)).isTrue();
        assertThat(encoder.matches("outra-senha", hash)).isFalse();
    }

    @Test
    void bcryptHashesWithPrefixStillMatch() {
        String legacy = "{bcrypt}" + new BCryptPasswordEncoder().encode("senha-antiga");

        assertThat(encoder.matches("senha-antiga", legacy)).isTrue();
        assertThat(encoder.matches("senha-errada", legacy)).isFalse();
    }

    @Test
    void hashWithoutPrefixIsRejectedWithoutThrowing() {
        String withoutPrefix = new BCryptPasswordEncoder().encode("senha-antiga");

        assertThat(encoder.matches("senha-antiga", withoutPrefix)).isFalse();
    }

    @Test
    void twoEncodingsOfTheSamePasswordDiffer() {
        assertThat(encoder.encode("igual")).isNotEqualTo(encoder.encode("igual"));
    }
}
