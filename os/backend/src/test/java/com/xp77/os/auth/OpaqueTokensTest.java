package com.xp77.os.auth;

import com.xp77.os.auth.service.OpaqueTokens;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpaqueTokensTest {

    @Test
    void newValuesHave256RandomBitsInUrlSafeText() {
        String value = OpaqueTokens.newValue();

        assertThat(value).matches("[A-Za-z0-9_-]{43}");
        assertThat(OpaqueTokens.newValue()).isNotEqualTo(value);
    }

    @Test
    void hashIsHexSha256() {
        assertThat(OpaqueTokens.sha256Hex("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
