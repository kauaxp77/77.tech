package com.xp77.os.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/** Substitui o JpaTransactionManager padrão do Spring Boot (que recua ao ver este bean). */
@Configuration(proxyBeanMethods = false)
public class TransactionConfig {

    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new OrgAwareJpaTransactionManager(entityManagerFactory);
    }
}
