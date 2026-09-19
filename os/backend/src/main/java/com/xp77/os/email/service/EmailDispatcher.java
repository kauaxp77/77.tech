package com.xp77.os.email.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Ciclo da fila: a cada 15 s, até 20 mensagens, cada uma na própria transação. */
@Component
public class EmailDispatcher {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatcher.class);

    private final EmailOutboxProcessor processor;
    private final int batchSize;

    public EmailDispatcher(EmailOutboxProcessor processor, @Value("${xp77.email.batch-size}") int batchSize) {
        this.processor = processor;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${xp77.email.dispatch-interval-ms}")
    public void tick() {
        try {
            dispatchBatch();
        } catch (RuntimeException e) {
            log.error("Falha inesperada no despacho de e-mails", e);
        }
    }

    /** @return quantas mensagens foram processadas (enviadas ou reagendadas). */
    public int dispatchBatch() {
        int processed = 0;
        while (processed < batchSize && processor.processNext()) {
            processed++;
        }
        return processed;
    }
}
