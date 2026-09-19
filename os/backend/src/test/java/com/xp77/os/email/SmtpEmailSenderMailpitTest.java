package com.xp77.os.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.service.EmailDispatcher;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Caminho real: fila → despacho → SMTP → Mailpit (o mesmo do ambiente local). */
class SmtpEmailSenderMailpitTest extends PostgresTestBase {

    static final GenericContainer<?> MAILPIT = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:latest"))
            .withExposedPorts(1025, 8025)
            .waitingFor(Wait.forHttp("/").forPort(8025));

    static {
        MAILPIT.start();
    }

    @DynamicPropertySource
    static void mailpit(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", MAILPIT::getHost);
        registry.add("spring.mail.port", () -> MAILPIT.getMappedPort(1025));
    }

    @Autowired
    private EmailService emails;

    @Autowired
    private EmailDispatcher dispatcher;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void emptyQueue() {
        ownerJdbc().update("delete from email_outbox");
    }

    @Test
    void resetEmailLeavesThroughTheQueueAndArrivesInMailpit() throws Exception {
        String to = TestData.uniqueEmail("mailpit");
        OrgContext.runAs(RootOrganization.ID, () -> emails.enqueue(to, EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "token-mailpit", "validityHours", 1), TestData.unique("mailpit")));

        assertThat(dispatcher.dispatchBatch()).isEqualTo(1);

        JsonNode message = waitForMessageTo(to);
        assertThat(message.get("Subject").asText()).isEqualTo("Redefinição de senha — 77xp");
        String text = mapper.readTree(get("/api/v1/message/" + message.get("ID").asText())).get("Text").asText();
        assertThat(text).contains("http://localhost:5173/redefinir-senha?token=token-mailpit");
    }

    private String get(String path) throws Exception {
        URI uri = URI.create("http://" + MAILPIT.getHost() + ":" + MAILPIT.getMappedPort(8025) + path);
        return HttpClient.newHttpClient()
                .send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.ofString())
                .body();
    }

    private JsonNode waitForMessageTo(String to) throws Exception {
        for (int attempt = 0; attempt < 25; attempt++) {
            for (JsonNode message : mapper.readTree(get("/api/v1/messages")).get("messages")) {
                for (JsonNode recipient : message.get("To")) {
                    if (to.equals(recipient.get("Address").asText())) {
                        return message;
                    }
                }
            }
            Thread.sleep(200);
        }
        throw new AssertionError("O e-mail para " + to + " não chegou ao Mailpit");
    }
}
