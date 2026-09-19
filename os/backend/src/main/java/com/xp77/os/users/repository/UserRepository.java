package com.xp77.os.users.repository;

import com.xp77.os.users.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** Recebe o e-mail já normalizado (minúsculo, sem espaços) pelo serviço. */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
