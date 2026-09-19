package com.xp77.os.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A auditoria abre transação própria (REQUIRES_NEW). Chamada de dentro de um método
 * @Transactional, ela faz a mesma thread segurar DUAS conexões ao mesmo tempo: a
 * suspensa e a nova.
 *
 * Isso não é erro por si só — é o preço de a auditoria sobreviver a um rollback. Mas
 * quanto mais caminhos fizerem isso, menor fica o número de requisições simultâneas
 * que o pool aguenta antes de travar (a conta está no application-prod.yml).
 *
 * Este teste prende a lista do que já existe. Um caminho novo quebra o CI e obriga
 * quem escreveu a decidir de propósito, em vez de o problema crescer sozinho.
 */
class TransactionNestingTest {

    /**
     * Métodos que hoje gravam auditoria de dentro da própria transação, e a frequência
     * de cada um — é ela que decide se o pool aguenta. A lista só cresce com decisão
     * consciente, e cada item novo obriga a refazer a conta do pool.
     *
     * - PasswordResetService.redeem: uma redefinição ou primeiro acesso. Raro.
     * - RefreshTokenService.rotate: só quando detecta reuso de token, que é incidente
     *   de segurança, não caminho normal. Raríssimo.
     *
     * Se algum dia entrar aqui um caminho comum (login, listagem, qualquer coisa que
     * acontece a toda hora), a conta muda de figura e o pool precisa subir muito.
     */
    private static final Set<String> KNOWN = Set.of(
            "PasswordResetService.redeem",
            "RefreshTokenService.rotate");

    private record Nesting(String where) {
    }

    /**
     * Varredura de texto, não de bytecode: procura, dentro do corpo de um método
     * anotado com @Transactional, uma chamada ao AuditLogger. É grosseira de
     * propósito — erra para o lado de apontar demais, que é o lado seguro.
     */
    private static List<Nesting> findNestings(Path file) throws IOException {
        List<String> lines = Files.readAllLines(file);
        String className = file.getFileName().toString().replace(".java", "");
        List<Nesting> found = new ArrayList<>();

        boolean insideTransactional = false;
        String currentMethod = null;
        int depth = 0;

        for (String raw : lines) {
            String line = raw.trim();
            if (line.startsWith("@Transactional")) {
                insideTransactional = true;
                continue;
            }
            if (insideTransactional && currentMethod == null && line.contains("(") && line.contains("public")) {
                currentMethod = line.replaceAll(".*\\s(\\w+)\\s*\\(.*", "$1");
                depth = 0;
            }
            if (currentMethod != null) {
                depth += raw.chars().filter(c -> c == '{').count();
                depth -= raw.chars().filter(c -> c == '}').count();
                if (line.matches(".*\\baudit\\.\\w+\\(.*")) {
                    found.add(new Nesting(className + "." + currentMethod));
                }
                if (depth <= 0 && line.startsWith("}")) {
                    currentMethod = null;
                    insideTransactional = false;
                }
            }
        }
        return found;
    }

    @Test
    void noNewPathWritesAuditFromInsideItsOwnTransaction() throws IOException {
        List<String> found;
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            found = files.filter(path -> path.toString().endsWith(".java"))
                    .flatMap(path -> {
                        try {
                            return findNestings(path).stream();
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .map(Nesting::where)
                    .distinct()
                    .sorted()
                    .toList();
        }

        assertThat(found)
                .as("""
                        Auditoria gravada de dentro de uma transação: a thread passa a segurar duas \
                        conexões. Se for de propósito, some o método à lista KNOWN deste teste E \
                        refaça a conta do pool em application-prod.yml. Se não for, mova a chamada \
                        para fora da transação.""")
                .containsExactlyInAnyOrderElementsOf(KNOWN);
    }
}
