package com.xp77.os.users.api;

import java.util.UUID;

/**
 * Visão pública de uma pessoa. Sem o hash da senha (o que não trafega não vaza);
 * hasPassword diz só se ela já passou pelo primeiro acesso.
 */
public record UserAccount(UUID id, String email, String name, boolean hasPassword) {
}
