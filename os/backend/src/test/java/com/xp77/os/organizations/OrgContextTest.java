package com.xp77.os.organizations;

import com.xp77.os.organizations.api.OrgContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgContextTest {

    @AfterEach
    void clean() {
        OrgContext.clear();
    }

    @Test
    void isEmptyUntilSomeoneSetsIt() {
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void setAndClear() {
        UUID org = UUID.randomUUID();
        OrgContext.set(org);
        assertThat(OrgContext.current()).contains(org);

        OrgContext.clear();
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void callAsRestoresThePreviousOrganization() {
        UUID outer = UUID.randomUUID();
        UUID inner = UUID.randomUUID();
        OrgContext.set(outer);

        UUID seen = OrgContext.callAs(inner, () -> OrgContext.current().orElseThrow());

        assertThat(seen).isEqualTo(inner);
        assertThat(OrgContext.current()).contains(outer);
    }

    @Test
    void callAsCleansUpEvenWhenTheActionFails() {
        assertThatThrownBy(() -> OrgContext.runAs(UUID.randomUUID(), () -> {
            throw new IllegalArgumentException("falhou");
        })).isInstanceOf(IllegalArgumentException.class);

        assertThat(OrgContext.current()).isEmpty();
    }
}
