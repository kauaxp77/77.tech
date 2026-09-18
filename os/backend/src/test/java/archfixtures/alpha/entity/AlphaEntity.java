package archfixtures.alpha.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Fixture do ArchUnit: entidade do módulo "alpha". Fora de com.xp77.os de propósito. */
@Entity
public class AlphaEntity {

    @Id
    private Long id;
}
