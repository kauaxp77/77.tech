package com.xp77.os.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A auditoria não pode segurar uma segunda conexão na mesma thread.
 *
 * Histórico: ela abria transação própria (REQUIRES_NEW). Chamada de dentro de um método
 * anotado com @Transactional, a thread ficava com DUAS conexões ao mesmo tempo — a
 * suspensa e a nova. Com requisições simultâneas suficientes, o pool esgota e todo
 * mundo espera até o tempo limite.
 *
 * Hoje o AuditLoggerImpl espera o commit quando já existe transação, e o problema
 * deixou de existir. Este teste é a cerca: se alguém voltar a abrir transação por cima
 * de outra para gravar auditoria, o CI avisa antes de ir para produção.
 */
class TransactionNestingTest {

    private static final Path AUDIT_LOGGER =
            Path.of("src/main/java/com/xp77/os/audit/service/AuditLoggerImpl.java");

    @Test
    void theAuditLoggerWaitsForTheCommitInsteadOfNestingATransaction() throws IOException {
        String source = Files.readString(AUDIT_LOGGER);

        assertThat(source)
                .as("dentro de uma transação, a auditoria tem de esperar o commit")
                .contains("isSynchronizationActive")
                .contains("afterCommit");
    }

    @Test
    void theOnlyPlaceThatOpensItsOwnTransactionIsTheAuditLoggerItself() throws IOException {
        // REQUIRES_NEW é o mecanismo que causava o problema. Se aparecer noutro lugar,
        // alguém precisa conferir se aquele caminho também pode esgotar o pool.
        String source = Files.readString(AUDIT_LOGGER);

        assertThat(source)
                .as("o AuditLoggerImpl ainda usa transação própria — mas só fora de outra")
                .contains("PROPAGATION_REQUIRES_NEW");
    }
}
