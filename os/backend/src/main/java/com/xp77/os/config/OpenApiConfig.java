package com.xp77.os.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Título da documentação. Ela só é publicada quando o perfil liga o springdoc (dev e test). */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI xp77OpenApi() {
        return new OpenAPI().info(new Info()
                .title("77xp OS API")
                .version("v1")
                .description("API do 77xp OS: login, contas de acesso, organizações, auditoria e Área do cliente."));
    }
}
