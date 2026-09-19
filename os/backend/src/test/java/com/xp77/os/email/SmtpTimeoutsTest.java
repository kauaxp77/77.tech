package com.xp77.os.email;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O JavaMail espera para sempre por padrão. A fila roda numa thread só: um servidor de
 * e-mail travado pararia todos os envios, com a linha travada no banco e sem backoff.
 */
class SmtpTimeoutsTest extends PostgresTestBase {

    @Autowired
    private JavaMailSenderImpl mailSender;

    @Test
    void everyProfileLimitsHowLongTheQueueWaitsForTheMailServer() {
        assertThat(mailSender.getJavaMailProperties())
                .containsEntry("mail.smtp.connectiontimeout", "10000")
                .containsEntry("mail.smtp.timeout", "10000")
                .containsEntry("mail.smtp.writetimeout", "10000");
    }
}
