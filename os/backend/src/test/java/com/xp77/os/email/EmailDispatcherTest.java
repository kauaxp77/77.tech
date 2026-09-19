package com.xp77.os.email;

import com.xp77.os.config.SchedulingConfig;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.entity.EmailOutbox;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.email.service.EmailDispatcher;
import com.xp77.os.email.service.EmailOutboxProcessor;
import com.xp77.os.email.service.EmailSender;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.mail.MailSendException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** O SMTP é a única fronteira externa: aqui ele é simulado (o teste com Mailpit usa o real). */
class EmailDispatcherTest extends PostgresTestBase {

    @Autowired
    private EmailService emails;

    @Autowired
    private EmailDispatcher dispatcher;

    @Autowired
    private EmailOutboxProcessor processor;

    @Autowired
    private EmailOutboxRepository outbox;

    @Autowired
    private ApplicationContext context;

    @MockitoBean
    private EmailSender sender;

    @BeforeEach
    void emptyQueue() {
        ownerJdbc().update("delete from email_outbox");
    }

    private String enqueueReset(String to) {
        String key = TestData.unique("despacho");
        OrgContext.runAs(RootOrganization.ID, () -> emails.enqueue(to, EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "tok-" + key, "validityHours", 1), key));
        return key;
    }

    @Test
    void dispatchSendsPendingMessagesAndMarksThemSent() {
        String key = enqueueReset("despacho@exemplo.com");

        assertThat(dispatcher.dispatchBatch()).isEqualTo(1);

        assertThat(outbox.findByDedupKey(key).orElseThrow().getStatus()).isEqualTo(EmailOutbox.SENT);
        verify(sender).send(eq("despacho@exemplo.com"), eq("Redefinição de senha — 77xp"),
                contains("/redefinir-senha?token=tok-" + key));
    }

    @Test
    void failedSendIsRetriedLaterWithBackoff() {
        doThrow(new MailSendException("SMTP fora do ar")).when(sender).send(anyString(), anyString(), anyString());
        String key = enqueueReset("falha@exemplo.com");
        Instant before = Instant.now();

        dispatcher.dispatchBatch();

        EmailOutbox message = outbox.findByDedupKey(key).orElseThrow();
        assertThat(message.getStatus()).isEqualTo(EmailOutbox.PENDING);
        assertThat(message.getAttempts()).isEqualTo(1);
        assertThat(message.getErrorMessage()).contains("SMTP fora do ar");
        assertThat(message.getNextAttemptAt()).isBetween(before.plusSeconds(55), Instant.now().plusSeconds(65));
    }

    @Test
    void aBatchProcessesAtMostTwentyMessages() {
        for (int i = 0; i < 25; i++) {
            enqueueReset("lote" + i + "@exemplo.com");
        }

        assertThat(dispatcher.dispatchBatch()).isEqualTo(20);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where status = 'PENDING'", Long.class)).isEqualTo(5L);
    }

    @Test
    void theRowStaysLockedWhileItIsBeingSent() throws Exception {
        String key = enqueueReset("trava@exemplo.com");
        CountDownLatch sending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            sending.countDown();
            release.await(10, TimeUnit.SECONDS);
            return null;
        }).when(sender).send(anyString(), anyString(), anyString());
        ExecutorService otherInstance = Executors.newSingleThreadExecutor();

        try {
            Future<Boolean> first = otherInstance.submit(processor::processNext);
            assertThat(sending.await(10, TimeUnit.SECONDS)).isTrue();

            // Enquanto a primeira transação envia, a linha segue travada: esta "instância" a pula.
            assertThat(processor.processNext()).isFalse();

            release.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isTrue();
        } finally {
            release.countDown();
            otherInstance.shutdownNow();
        }

        verify(sender, times(1)).send(anyString(), anyString(), anyString());
        assertThat(outbox.findByDedupKey(key).orElseThrow().getStatus()).isEqualTo(EmailOutbox.SENT);
    }

    @Test
    void backgroundJobsAreOffInTests() {
        assertThat(context.getBeansOfType(SchedulingConfig.class)).isEmpty();
    }
}
