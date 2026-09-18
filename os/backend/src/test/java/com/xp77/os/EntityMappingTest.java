package com.xp77.os;

import com.xp77.os.organizations.entity.Organization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.entity.User;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.EntityType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O contexto só sobe se o Hibernate validar cada entidade contra o banco
 * (ddl-auto: validate); este teste garante que as entidades estão no mapeamento.
 */
class EntityMappingTest extends PostgresTestBase {

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void foundationEntitiesAreMappedAndValidatedAgainstTheSchema() {
        // A lista é montada com tipo declarado porque getJavaType() devolve
        // Class<capture>, que não casa com os Class<Organization>… de contains().
        List<Class<?>> mapped = entityManagerFactory.getMetamodel().getEntities().stream()
                .<Class<?>>map(EntityType::getJavaType)
                .toList();

        assertThat(mapped).contains(Organization.class, User.class, Membership.class);
    }
}
