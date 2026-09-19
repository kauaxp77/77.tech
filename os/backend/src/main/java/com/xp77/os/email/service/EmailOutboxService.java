package com.xp77.os.email.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.organizations.api.OrgContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class EmailOutboxService implements EmailService {

    private final EmailOutboxRepository outbox;
    private final ObjectMapper mapper;

    public EmailOutboxService(EmailOutboxRepository outbox, ObjectMapper mapper) {
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public boolean enqueue(String to, String template, Map<String, Object> data, String dedupKey) {
        UUID orgId = OrgContext.current()
                .orElseThrow(() -> new IllegalStateException("E-mail enfileirado sem organização no contexto"));
        String payload;
        try {
            payload = mapper.writeValueAsString(data == null ? Map.of() : data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Não foi possível serializar os dados do e-mail", e);
        }
        return outbox.insertIfAbsent(orgId, to, template, payload, dedupKey) == 1;
    }
}
