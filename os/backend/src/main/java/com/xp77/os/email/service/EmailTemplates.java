package com.xp77.os.email.service;

import com.xp77.os.email.api.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Assunto e corpo (texto simples, em português) de cada template. */
@Component
public class EmailTemplates {

    public record RenderedEmail(String subject, String body) {
    }

    private final String baseUrl;

    public EmailTemplates(@Value("${xp77.email.base-url}") String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public RenderedEmail render(String template, Map<String, Object> data) {
        return switch (template) {
            case EmailService.Templates.PRIMEIRO_ACESSO -> new RenderedEmail("Seu acesso ao painel da 77xp", """
                    Olá!

                    Sua conta no painel da 77xp foi criada.

                    Crie sua senha neste link (válido por %s):
                    %s/primeiro-acesso?token=%s

                    Se você não esperava este e-mail, ignore esta mensagem.

                    Equipe 77xp""".formatted(validity(data), baseUrl, token(data)));
            case EmailService.Templates.REDEFINIR_SENHA -> new RenderedEmail("Redefinição de senha — 77xp", """
                    Olá!

                    Recebemos um pedido para redefinir a senha da sua conta na 77xp.

                    Use este link (válido por %s):
                    %s/redefinir-senha?token=%s

                    Se não foi você, ignore esta mensagem: sua senha continua a mesma.

                    Equipe 77xp""".formatted(validity(data), baseUrl, token(data)));
            default -> throw new IllegalArgumentException("Template de e-mail desconhecido: " + template);
        };
    }

    private static String token(Map<String, Object> data) {
        Object token = data.get("token");
        if (token == null || token.toString().isBlank()) {
            throw new IllegalArgumentException("E-mail sem token");
        }
        return token.toString();
    }

    private static String validity(Map<String, Object> data) {
        if (!(data.get("validityHours") instanceof Number hours)) {
            throw new IllegalArgumentException("E-mail sem validade do link");
        }
        return hours.longValue() == 1 ? "1 hora" : hours.longValue() + " horas";
    }
}
