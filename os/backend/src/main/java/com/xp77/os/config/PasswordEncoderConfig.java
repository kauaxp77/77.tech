package com.xp77.os.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Senhas novas em Argon2id. Hashes "{bcrypt}..." continuam aceitos (contas vindas
 * de outro sistema) e são promovidos para Argon2 no primeiro login bem-sucedido.
 * O DelegatingPasswordEncoder escolhe o algoritmo pelo prefixo {id} do hash.
 */
@Configuration
public class PasswordEncoderConfig {

    public static final String CURRENT_ID = "argon2";
    public static final String CURRENT_PREFIX = "{" + CURRENT_ID + "}";

    @Bean
    public PasswordEncoder passwordEncoder() {
        Map<String, PasswordEncoder> encoders = Map.of(
                CURRENT_ID, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(),
                "bcrypt", new BCryptPasswordEncoder());

        DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder(CURRENT_ID, encoders);

        // Hash sem prefixo não é adivinhado: recusar de forma limpa é melhor do que
        // supor um algoritmo. Este encoder só participa de matches() e nunca codifica.
        delegating.setDefaultPasswordEncoderForMatches(new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                throw new UnsupportedOperationException("encode sempre usa o algoritmo atual: " + CURRENT_ID);
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return false;
            }
        });

        return delegating;
    }
}
