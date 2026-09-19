package com.xp77.os.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Liga os @Scheduled só quando xp77.scheduling.enabled=true (desligado no perfil test). */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(prefix = "xp77.scheduling", name = "enabled", havingValue = "true")
public class SchedulingConfig {
}
