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
    void unknownTemplateOrMissingTokenIsRefused() {
        assertThatThrownBy(() -> templates.render("QUALQUER", Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> templates.render(EmailService.Templates.REDEFINIR_SENHA, Map.of("validityHours", 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
