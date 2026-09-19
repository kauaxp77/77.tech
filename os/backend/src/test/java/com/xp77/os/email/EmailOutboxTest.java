package com.xp77.os.email;

import com.xp77.os.email.entity.EmailOutbox;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EmailOutboxTest {

    private EmailOutbox message() {
        return new EmailOutbox(UUID.randomUUID(), "a@exemplo.com", "REDEFINIR_SENHA", "{}", "chave");
    }

    @Test
    void backoffIsOneFiveThirtyMinutesTwoAndTwelveHoursThenFailed() {
        EmailOutbox message = message();
        Instant now = Instant.parse("2026-09-18T12:00:00Z");
        List<Duration> expected = List.of(Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(30),
                Duration.ofHours(2), Duration.ofHours(12));

        for (int i = 0; i < expected.size(); i++) {
            message.registerFailure("smtp fora do ar", now);
            assertThat(message.getStatus()).isEqualTo(EmailOutbox.PENDING);
            assertThat(message.getAttempts()).isEqualTo(i + 1);
            assertThat(message.getNextAttemptAt()).isEqualTo(now.plus(expected.get(i)));
        }

        message.registerFailure("smtp fora do ar", now);
        assertThat(message.getStatus()).isEqualTo(EmailOutbox.FAILED);
        assertThat(message.getAttempts()).isEqualTo(6);
        assertThat(message.getErrorMessage()).isEqualTo("smtp fora do ar");
    }

    @Test
    void markSentRecordsTheMomentAndClearsTheError() {
        EmailOutbox message = message();
        message.registerFailure("falhou", Instant.now());
        Instant sentAt = Instant.parse("2026-09-18T12:05:00Z");

        message.markSent(sentAt);

        assertThat(message.getStatus()).isEqualTo(EmailOutbox.SENT);
        assertThat(message.getSentAt()).isEqualTo(sentAt);
        assertThat(message.getErrorMessage()).isNull();
    }
}
