package com.xp77.os.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base dos testes com banco. Um único Postgres 17 por execução da suíte.
 *
 * <p>Duas credenciais, como em produção: a aplicação conecta como app_77xp
 * (sem BYPASSRLS, não é dona das tabelas) e o Flyway como o dono. O
 * {@link #ownerJdbc()} conecta como o dono (superusuário no container, ignora RLS)
 * e serve para preparar e conferir dados por fora da aplicação.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class PostgresTestBase {

    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("xp77")
                    .withUsername("xp77")
                    .withPassword("xp77")
                    .withInitScript("db/testcontainers-init.sql");

    private static JdbcTemplate owner;

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", () -> "app_77xp");
        registry.add("spring.datasource.password", () -> "app");
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }

    protected static synchronized JdbcTemplate ownerJdbc() {
        if (owner == null) {
            owner = new JdbcTemplate(new DriverManagerDataSource(
                    POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        }
        return owner;
    }
}
