package com.xp77.os.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** .env.example igual ao que a configuração lê; um só nome por variável (lição 7 do Beto_Banco). */
class EnvExampleTest {

    private static final Pattern ENV_PLACEHOLDER = Pattern.compile("\\$\\{([A-Z][A-Z0-9_]*)(?::[^}]*)?}");

    private static final List<String> AGREED = List.of(
            "DATABASE_URL", "DATABASE_USER", "DATABASE_PASSWORD", "FLYWAY_USER", "FLYWAY_PASSWORD",
            "JWT_SECRET", "MAX_ACTIVE_SESSIONS", "CORS_ALLOWED_ORIGINS", "APP_BASE_URL",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM",
            "BOOTSTRAP_OWNER_EMAIL", "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE");

    private static Set<String> variablesReadByTheConfiguration() throws IOException {
        Set<String> found = new TreeSet<>();
        for (String file : List.of("application.yml", "application-dev.yml", "application-prod.yml")) {
            Matcher matcher = ENV_PLACEHOLDER.matcher(new String(
                    new ClassPathResource(file).getInputStream().readAllBytes(), StandardCharsets.UTF_8));
            while (matcher.find()) {
                found.add(matcher.group(1));
            }
        }
        return found;
    }

    /** O Maven roda os testes com o diretório os/backend como diretório de trabalho. */
    private static Set<String> keysOfEnvExample() throws IOException {
        return Files.readAllLines(Path.of(".env.example")).stream()
                .map(String::trim)
                .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                .map(line -> line.substring(0, line.indexOf('=')))
                .collect(Collectors.toCollection(TreeSet::new));
    }

    @Test
    void envExampleListsExactlyTheVariablesTheConfigurationReads() throws IOException {
        assertThat(keysOfEnvExample()).isEqualTo(variablesReadByTheConfiguration());
    }

    @Test
    void theConfigurationReadsExactlyTheVariablesAgreedInTheSpec() throws IOException {
        assertThat(variablesReadByTheConfiguration()).containsExactlyInAnyOrderElementsOf(AGREED);
    }

    @Test
    void javaCodeNeverReadsEnvironmentVariablesDirectly() throws IOException {
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            List<String> offenders = files.filter(path -> path.toString().endsWith(".java"))
                    .filter(path -> {
                        try {
                            return ENV_PLACEHOLDER.matcher(Files.readString(path)).find();
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .map(Path::toString)
                    .toList();
            assertThat(offenders).as("variáveis de ambiente só nos application*.yml").isEmpty();
        }
    }
}
