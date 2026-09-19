package archfixtures.alpha.repository;

import archfixtures.alpha.entity.AlphaEntity;

/** Fixture do ArchUnit: repositório do módulo "alpha". */
public interface AlphaRepository {

    AlphaEntity find(Long id);
}
