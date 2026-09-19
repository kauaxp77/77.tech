package com.xp77.os.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * O IP de quem fez a requisição, escolhido de forma que o cliente não consiga forjar.
 *
 * <p>Cada proxy ACRESCENTA ao X-Forwarded-For o endereço de quem falou com ele; o que
 * vem antes pode ter sido escrito pelo próprio cliente. Com N proxies confiáveis na
 * frente da API, o cliente é o N-ésimo endereço contado da direita (a conexão direta
 * conta como o último). O Beto_Banco usava o PRIMEIRO valor, que qualquer um forja
 * chamando o Render direto.
 */
@Component
public class ClientIpResolver {

    /** IPv4 ou IPv6 em texto. O que não parece IP não vira chave. */
    private static final Pattern IP = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final int trustedProxyHops;

    public ClientIpResolver(@Value("${xp77.rate-limit.trusted-proxy-hops}") int trustedProxyHops) {
        if (trustedProxyHops < 0) {
            throw new IllegalArgumentException("xp77.rate-limit.trusted-proxy-hops não pode ser negativo");
        }
        this.trustedProxyHops = trustedProxyHops;
    }

    public String resolve(HttpServletRequest request) {
        List<String> chain = new ArrayList<>();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            for (String part : forwardedFor.split(",")) {
                String address = part.trim();
                if (!address.isEmpty()) {
                    chain.add(address);
                }
            }
        }
        chain.add(request.getRemoteAddr());
        String candidate = chain.get(Math.max(0, chain.size() - 1 - trustedProxyHops));
        return IP.matcher(candidate).matches() ? candidate : request.getRemoteAddr();
    }
}
