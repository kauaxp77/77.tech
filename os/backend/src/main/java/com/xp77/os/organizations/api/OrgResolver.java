package com.xp77.os.organizations.api;

import java.util.UUID;

/** Descobre a organização de uma rota pública pelo domínio da requisição. */
public interface OrgResolver {

    /** Organização ativa cujo domínio é o host informado; sem cadastro, a raiz (77xp). */
    UUID resolve(String host);
}
