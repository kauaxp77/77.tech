package com.xp77.os.config;

import com.xp77.os.Xp77OsApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** O perfil prod exige cada segredo sem valor padrão, falha rápido e não publica a documentação. */
class ProductionConfigTest {

    private static final List<String> REQUIRED_IN_PROD = List.of(
            "DATABASE_URL", "DATABASE_USER", "DATABASE_PASSWORD", "FLYWAY_USER", "FLYWAY_PASSWORD",
            "JWT_SECRET", "CORS_ALLOWED_ORIGINS", "APP_BASE_URL",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM");

    private static String read(String file) throws IOException {
        return new String(new ClassPathResource(file).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static Properties yaml(String file) {
        YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
        factory.setResources(new ClassPathResource(file));
        return factory.getObject();
    }

    @Test
    void everySecretIsRequiredInProductionWithoutADefault() throws IOException {
        String prod = read("application-prod.yml");

        for (String variable : REQUIRED_IN_PROD) {
            assertThat(prod).as(variable).contains("${" + variable + "}");
            assertThat(prod).as(variable + " sem valor padrão").doesNotContain("${" + variable + ":");
        }
    }

    @Test
    void apiDocumentationIsOffUnlessAProfileTurnsItOn() {
        Properties base = yaml("application.yml");
        Properties prod = yaml("application-prod.yml");

        assertThat(base.getProperty("springdoc.api-docs.enabled")).isEqualTo("false");
        assertThat(base.getProperty("springdoc.swagger-ui.enabled")).isEqualTo("false");
        assertThat(prod.getProperty("springdoc.api-docs.enabled")).isNull();
        assertThat(prod.getProperty("springdoc.swagger-ui.enabled")).isNull();
    }

    /**
     * Sem as variáveis, a subida falha. Qual bean cai primeiro varia (um @Value sem valor
     * dá "Could not resolve placeholder"; a URL do banco sem valor chega ao pool como o
     * texto "${DATABASE_URL}"), mas em todos os casos o erro mostra a variável que faltou.
     */
    @Test
    void productionRefusesToStartWithoutItsVariables() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(Xp77OsApplication.class).profiles("prod").run().close())
                .hasStackTraceContaining("${");
    }
}
