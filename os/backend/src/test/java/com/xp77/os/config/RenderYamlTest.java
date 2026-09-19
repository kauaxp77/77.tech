package com.xp77.os.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O render.yaml não pode ganhar segredo escrito. O que protege não é a boa intenção de
 * quem edita — é este teste: um `value:` numa variável da lista abaixo quebra o CI antes
 * de a chave chegar ao GitHub, onde ela viveria para sempre no histórico.
 *
 * O Maven roda os testes com os/backend como diretório de trabalho; o render.yaml está
 * um nível acima, em os/.
 */
class RenderYamlTest {

    private static final Path RENDER_YAML = Path.of("..", "render.yaml");

    /** Tudo o que é chave, senha, endereço de banco ou destinatário: valor só no painel. */
    private static final Set<String> SECRETS = Set.of(
            "DATABASE_URL", "DATABASE_USER", "DATABASE_PASSWORD",
            "FLYWAY_USER", "FLYWAY_PASSWORD", "JWT_SECRET",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM",
            "APP_BASE_URL", "CORS_ALLOWED_ORIGINS", "BOOTSTRAP_OWNER_EMAIL",
            "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE", "MAX_ACTIVE_SESSIONS");

    /** Uma entrada de envVars: a chave e a linha seguinte (value: ou sync:). */
    private record EnvVar(String key, String next) {
    }

    private static List<EnvVar> envVarsOf(List<String> lines) {
        List<EnvVar> found = new ArrayList<>();
        Pattern key = Pattern.compile("^\\s*- key:\\s*([A-Z][A-Z0-9_]*)\\s*$");
        for (int i = 0; i < lines.size(); i++) {
            Matcher matcher = key.matcher(lines.get(i));
            if (matcher.matches()) {
                found.add(new EnvVar(matcher.group(1), i + 1 < lines.size() ? lines.get(i + 1).trim() : ""));
            }
        }
        return found;
    }

    @Test
    void everySecretIsSyncFalseAndHasNoValueWrittenDown() throws IOException {
        List<String> offenders = envVarsOf(Files.readAllLines(RENDER_YAML)).stream()
                .filter(env -> SECRETS.contains(env.key()))
                .filter(env -> !env.next().equals("sync: false"))
                .map(env -> env.key() + " -> " + env.next())
                .toList();

        assertThat(offenders)
                .as("segredo com valor no render.yaml (use sync: false e preencha no painel)")
                .isEmpty();
    }

    @Test
    void bothServicesDeclareEverySecret() throws IOException {
        List<EnvVar> all = envVarsOf(Files.readAllLines(RENDER_YAML));
        Set<String> declared = new TreeSet<>(all.stream().map(EnvVar::key).toList());

        // Os dois serviços declaram a mesma lista, então cada segredo aparece duas vezes.
        assertThat(declared).containsAll(SECRETS);
        for (String secret : SECRETS) {
            assertThat(all.stream().filter(env -> env.key().equals(secret)).count())
                    .as("%s precisa estar nos dois serviços (oficial e teste)", secret)
                    .isEqualTo(2);
        }
    }

    @Test
    void healthCheckAndDockerfileAreConfigured() throws IOException {
        String yaml = Files.readString(RENDER_YAML);

        // Sem health check, o Render manda tráfego para uma instância que ainda sobe.
        assertThat(yaml).contains("healthCheckPath: /api/v1/actuator/health");
        assertThat(yaml).contains("rootDir: os/backend");
        // O plano grátis dorme e bloqueia SMTP: sem e-mail não há convite nem senha nova.
        assertThat(yaml).doesNotContain("plan: free");
    }

    @Test
    void theOfficialServiceFollowsMainAndTheTestOneFollowsTeste() throws IOException {
        String yaml = Files.readString(RENDER_YAML);

        assertThat(yaml).contains("name: 77xp-os-api").contains("branch: main");
        assertThat(yaml).contains("name: 77xp-os-api-teste").contains("branch: teste");
    }
}
