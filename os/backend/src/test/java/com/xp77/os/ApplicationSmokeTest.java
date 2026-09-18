package com.xp77.os;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApplicationSmokeTest extends PostgresTestBase {

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void healthRespondsUpUnderTheContextPath() throws Exception {
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create(
                        "http://localhost:" + port + "/api/v1/actuator/health")).build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void applicationConnectsAsAppRoleAndOwnerIsSeparate() {
        assertThat(jdbc.queryForObject("select current_user", String.class)).isEqualTo("app_77xp");
        assertThat(ownerJdbc().queryForObject("select current_user", String.class)).isEqualTo("xp77");
    }

    @Test
    void databaseIsPostgres17() {
        assertThat(jdbc.queryForObject("show server_version", String.class)).startsWith("17.");
    }
}
