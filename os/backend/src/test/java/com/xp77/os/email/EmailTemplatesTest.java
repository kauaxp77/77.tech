package com.xp77.os.email;

import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.service.EmailTemplates;
import com.xp77.os.email.service.EmailTemplates.RenderedEmail;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailTemplatesTest {

    private final EmailTemplates templates = new EmailTemplates("http://localhost:5173/");

    @Test
    void firstAccessEmailLinksToTheFirstAccessPage() {
        RenderedEmail email = templates.render(EmailService.Templates.PRIMEIRO_ACESSO,
                Map.of("token", "abc123", "validityHours", 72));

        assertThat(email.subject()).isEqualTo("Seu acesso ao painel da 77xp");
        assertThat(email.body()).contains("http://localhost:5173/primeiro-acesso?token=abc123").contains("72 horas");
    }

    @Test
    void resetEmailLinksToTheResetPage() {
        RenderedEmail email = templates.render(EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "xyz", "validityHours", 1));

        assertThat(email.subject()).isEqualTo("Redefinição de senha — 77xp");
        assertThat(email.body()).contains("http://localhost:5173/redefinir-senha?token=xyz")
                .contains("1 hora").doesNotContain("1 horas");
    }

    @Test
    void clientInvitationWithTokenLinksToFirstAccessAndMentionsTheClientArea() {
        RenderedEmail email = templates.render(EmailService.Templates.CONVITE,
                Map.of("role", "CLIENT", "name", "Ana", "token", "tok-1", "validityHours", 72));

        assertThat(email.subject()).isEqualTo("Seu acesso à Área do cliente da 77xp");
        assertThat(email.body()).startsWith("Olá, Ana!").contains("Área do cliente")
                .contains("http://localhost:5173/primeiro-acesso?token=tok-1").contains("72 horas");
    }

    @Test
    void teamInvitationForSomeoneWhoAlreadyHasAPasswordLinksToLogin() {
        RenderedEmail email = templates.render(EmailService.Templates.CONVITE, Map.of("role", "ADMIN"));

        assertThat(email.subject()).isEqualTo("Convite para o painel da 77xp");
        assertThat(email.body()).startsWith("Olá!").contains("como administrador")
                .contains("http://localhost:5173/entrar").doesNotContain("primeiro-acesso");
    }

    @Test
    void unknownTemplateOrMissingTokenIsRefused() {
        assertThatThrownBy(() -> templates.render("QUALQUER", Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> templates.render(EmailService.Templates.REDEFINIR_SENHA, Map.of("validityHours", 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
