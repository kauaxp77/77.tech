package com.xp77.os.email.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.entity.EmailOutbox;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.email.service.EmailTemplates.RenderedEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * Processa UMA mensagem por transação. O FOR UPDATE SKIP LOCKED e o envio acontecem
 * na mesma transação, então a linha fica travada até o commit — depois do envio.
 * É chamado por outro bean (EmailDispatcher): assim o @Transactional passa pelo proxy
 * do Spring de verdade (chamada interna, this.metodo(), o ignoraria).
 *
 * <p>Garantia at-least-once: se o processo morrer entre o envio e o commit, a mensagem
 * volta a PENDING e sai de novo. Nunca receber seria pior que receber duas vezes.
 */
@Component
public class EmailOutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxProcessor.class);

    private final EmailOutboxRepository outbox;
    private final EmailTemplates templates;
    private final EmailSender sender;
    private final ObjectMapper mapper;

    public EmailOutboxProcessor(EmailOutboxRepository outbox, EmailTemplates templates,
                                EmailSender sender, ObjectMapper mapper) {
        this.outbox = outbox;
        this.templates = templates;
        this.sender = sender;
        this.mapper = mapper;
    }

    /** @return false quando não há mensagem vencida e livre. */
    @Transactional
    public boolean processNext() {
        Optional<EmailOutbox> next = outbox.lockNextDue(Instant.now());
        if (next.isEmpty()) {
            return false;
        }
        EmailOutbox message = next.get();
        try {
            Map<String, Object> data = mapper.readValue(message.getPayload(), new TypeReference<>() {
            });
            RenderedEmail email = templates.render(message.getTemplate(), data);
            sender.send(message.getToAddress(), email.subject(), email.body());
            message.markSent(Instant.now());
        } catch (Exception e) {
            log.warn("Falha ao enviar o e-mail {} ({}): {}", message.getId(), message.getTemplate(), e.getMessage());
            message.registerFailure(e.getMessage(), Instant.now());
        }
        outbox.save(message);
        return true;
    }
}
