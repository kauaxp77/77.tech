package com.xp77.os.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ClientIpResolverTest {

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void withOneTrustedProxyTheAddressItRecordedIsTheClientAndForgedValuesAreIgnored() {
        // O cliente mandou "203.0.113.9" forjado; o proxy confiável acrescentou o IP real.
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.1", "203.0.113.9, 198.51.100.7")))
                .isEqualTo("198.51.100.7");
    }

    @Test
    void withoutForwardedHeaderTheConnectionAddressIsUsed() {
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.2", null))).isEqualTo("10.0.0.2");
    }

    @Test
    void zeroTrustedProxiesAlwaysUsesTheConnectionAddress() {
        assertThat(new ClientIpResolver(0).resolve(request("10.0.0.3", "203.0.113.9"))).isEqualTo("10.0.0.3");
    }

    @Test
    void twoTrustedProxiesSkipTheirOwnEntries() {
        assertThat(new ClientIpResolver(2).resolve(request("10.0.0.1", "203.0.113.9, 198.51.100.7")))
                .isEqualTo("203.0.113.9");
    }

    @Test
    void valueThatIsNotAnIpFallsBackToTheConnectionAddress() {
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.4", "x".repeat(500)))).isEqualTo("10.0.0.4");
    }

    @Test
    void negativeHopsAreRejected() {
        assertThatThrownBy(() -> new ClientIpResolver(-1)).isInstanceOf(IllegalArgumentException.class);
    }
}
