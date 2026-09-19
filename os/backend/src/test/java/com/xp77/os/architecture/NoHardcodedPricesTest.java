package com.xp77.os.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Preço é dado, nunca código.
 *
 * O sistema chegou a ter QUATRO tabelas de preço escritas em arquivos diferentes, e as
 * quatro discordavam: um projeto padrão valia R$ 30.000 na calculadora do site,
 * R$ 4.000 na proposta e R$ 1.500 no forecast. Ninguém decidiu isso — foi acontecendo,
 * um número por vez, cada um num lugar.
 *
 * Este teste existe para a quinta não nascer. Ele procura valores grandes e redondos
 * (candidatos a preço) no código do OS e falha se achar algum fora da migração que
 * semeia o catálogo.
 */
class NoHardcodedPricesTest {

    /**
     * Números redondos de 4 dígitos para cima: 1500, 45000, 800000. Preço parece assim.
     * Abaixo disso há tempo em milissegundos, tamanho de coluna e código HTTP demais
     * para valer a pena.
     */
    private static final Pattern SUSPICIOUS = Pattern.compile("(?<![\\w.])(\\d{4,})(?:L|_00)?(?![\\w.])");

    /** Onde preço PODE aparecer, com o motivo. */
    private static final Set<String> ALLOWED_FILES = Set.of(
            // A semente do catálogo: é o único lugar do sistema que escreve preço.
            "V8__price_catalog.sql");

    /** Números grandes que não são dinheiro. */
    private static final Set<Long> NOT_MONEY = Set.of(
            1000L, 10000L, 15000L, 30000L, 60000L, 86400L, 3600L,  // tempo em ms e em s
            1024L, 2048L, 4096L, 8192L, 65536L,                     // tamanhos
            1900L, 2000L, 2020L, 2024L, 2025L, 2026L, 2030L);       // anos

    /** UUID tem blocos de dígitos que passam por preço: 0000-4000-8000. */
    private static final Pattern UUID_LIKE = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    private record Suspect(String file, int line, long value) {
    }

    private static List<Suspect> scan(Path file) throws IOException {
        if (ALLOWED_FILES.contains(file.getFileName().toString())) {
            return List.of();
        }
        List<Suspect> found = new ArrayList<>();
        List<String> lines = Files.readAllLines(file);
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            // Comentário não é código: a conta do pool e este javadoc citam números.
            String semComentario = UUID_LIKE.matcher(line.replaceAll("//.*|--.*|\\*.*", ""))
                    .replaceAll("UUID");
            Matcher matcher = SUSPICIOUS.matcher(semComentario);
            while (matcher.find()) {
                long value = Long.parseLong(matcher.group(1));
                if (!NOT_MONEY.contains(value) && value % 100 == 0) {
                    found.add(new Suspect(file.getFileName().toString(), i + 1, value));
                }
            }
        }
        return found;
    }

    @Test
    void noPriceIsWrittenInCode() throws IOException {
        List<String> suspects;
        try (Stream<Path> files = Stream.concat(
                Files.walk(Path.of("src/main/java")),
                Files.walk(Path.of("src/main/resources/db/migration")))) {
            suspects = files
                    .filter(path -> path.toString().endsWith(".java") || path.toString().endsWith(".sql"))
                    .flatMap(path -> {
                        try {
                            return scan(path).stream();
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .map(suspect -> "%s:%d -> %d".formatted(suspect.file(), suspect.line(), suspect.value()))
                    .toList();
        }

        assertThat(suspects)
                .as("""
                        Número que parece preço, escrito em código. Preço mora no catálogo \
                        (tabela price_items), editável pelo dono na tela. Se o número não for \
                        dinheiro, acrescente-o à lista NOT_MONEY deste teste explicando o que é.""")
                .isEmpty();
    }
}
