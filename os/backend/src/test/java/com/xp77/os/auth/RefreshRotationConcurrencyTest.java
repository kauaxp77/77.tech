package com.xp77.os.auth;

import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Duas renovações ao mesmo tempo com o MESMO token: é assim que um token roubado chega ao
 * servidor junto com o legítimo. Sem trava no banco, as duas passariam e a detecção de
 * reuso nunca dispararia.
 */
class RefreshRotationConcurrencyTest extends PostgresTestBase {

    @Autowired
    private RefreshTokenService sessions;

    @Test
    void twoSimultaneousRotationsOfTheSameTokenLeaveOnlyOneSuccessor() throws Exception {
        UUID user = TestData.createUser(TestData.uniqueEmail("corrida"), null);
        String stolen = sessions.issue(user, RootOrganization.ID, Origin.UNKNOWN);
        CyclicBarrier together = new CyclicBarrier(2);
        Callable<Optional<Rotation>> rotate = () -> {
            together.await(10, TimeUnit.SECONDS);
            return sessions.rotate(stolen, Origin.UNKNOWN);
        };
        ExecutorService threads = Executors.newFixedThreadPool(2);

        try {
            Future<Optional<Rotation>> first = threads.submit(rotate);
            Future<Optional<Rotation>> second = threads.submit(rotate);
            List<Optional<Rotation>> results = List.of(first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS));

            assertThat(results.stream().filter(Optional::isPresent)).hasSize(1);
        } finally {
            threads.shutdownNow();
        }

        // Um sucessor só: o original mais um. Dois seriam duas sessões vivas do mesmo roubo.
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from refresh_tokens where user_id = ?", Long.class, user)).isEqualTo(2L);
        // E o que restou também caiu: a segunda tentativa viu o reuso e revogou tudo.
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from refresh_tokens where user_id = ? and revoked_at is null",
                Long.class, user)).isZero();
    }
}
