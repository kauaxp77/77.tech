package com.xp77.os.email.service;

/** Transporte do e-mail. Trocar SMTP por uma API de provedor é escrever outra implementação. */
public interface EmailSender {

    void send(String to, String subject, String body);
}
