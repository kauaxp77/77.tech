package com.xp77.os.audit.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Liga o registro automático a todas as rotas do painel. */
@Configuration
public class AuditWebConfig implements WebMvcConfigurer {

    private final AdminAuditInterceptor interceptor;

    public AuditWebConfig(AdminAuditInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/admin/**");
    }
}
