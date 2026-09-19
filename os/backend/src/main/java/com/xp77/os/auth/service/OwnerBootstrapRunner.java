package com.xp77.os.auth.service;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Comando de inicialização: com BOOTSTRAP_OWNER_EMAIL preenchido, garante o dono da
 * organização 77xp a cada subida. Bean separado do serviço transacional, para o
 * {@code @Transactional} valer de verdade.
 */
@Component
public class OwnerBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrapRunner.class);

    private final OwnerBootstrapService bootstrap;
    private final String ownerEmail;

    public OwnerBootstrapRunner(OwnerBootstrapService bootstrap,
                                @Value("${xp77.bootstrap.owner-email}") String ownerEmail) {
        this.bootstrap = bootstrap;
        this.ownerEmail = ownerEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (ownerEmail == null || ownerEmail.isBlank()) {
            return;
        }
        boolean created = OrgContext.callAs(RootOrganization.ID, () -> bootstrap.ensureOwner(ownerEmail.trim()));
        log.info(created
                ? "Dono da organização 77xp criado; e-mail de primeiro acesso enfileirado."
                : "Dono da organização 77xp já existia; nada a fazer.");
    }
}
