package archfixtures.beta.service;

import archfixtures.alpha.entity.AlphaEntity;

/** Fixture do ArchUnit: o módulo "beta" usando a entidade do "alpha" — proibido. */
public class BetaService {

    public AlphaEntity load() {
        return new AlphaEntity();
    }
}
