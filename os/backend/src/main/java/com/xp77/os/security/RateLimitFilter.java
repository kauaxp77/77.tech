package com.xp77.os.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.ErrorPayload;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.shared.trace.TraceIdFilter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Limita tentativas nas rotas públicas de senha, por visitante e por rota.
 *
 * <p>Por visitante: contra força bruta de um mesmo lugar, com o IP do ClientIpResolver
 * (o endereço registrado pelo proxy confiável — nunca o primeiro valor do
 * X-Forwarded-For). Por rota: um teto geral, bem mais alto, que protege o servidor de
 * quem troca de IP a cada tentativa.
 *
 * <p>Limitação conhecida: os contadores vivem em memória, então o limite efetivo
 * multiplica pelo número de instâncias.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final Duration WINDOW = Duration.ofMinutes(1);

    /** Contador parado há mais de uma janela já está cheio de novo: apagá-lo não muda nada. */
    private static final int MAX_COUNTERS = 50_000;

    private record Rule(int perVisitorMultiple, int routeWideMultiple) {
    }

    /** Casamento por sufixo: cobre "/api/v1/auth/login" (servidor) e "/auth/login" (MockMvc). */
    private static final Map<String, Rule> RULES = Map.of(
            "/auth/login", new Rule(1, 20),
            "/auth/forgot-password", new Rule(1, 10),
            "/auth/reset-password", new Rule(1, 20),
            "/auth/first-access", new Rule(1, 20));

    private record Counter(Bucket bucket, AtomicLong lastUse) {
    }

    private final Map<String, Counter> perVisitor = new ConcurrentHashMap<>();
    private final Map<String, Bucket> routeWide = new HashMap<>();
    private final AtomicBoolean cleaning = new AtomicBoolean(false);
    private final ObjectMapper mapper;
    private final ClientIpResolver clientIp;
    private final int limit;

    public RateLimitFilter(ObjectMapper mapper, ClientIpResolver clientIp,
                           @Value("${xp77.rate-limit.per-minute}") int limit) {
        this.mapper = mapper;
        this.clientIp = clientIp;
        this.limit = limit;
        RULES.forEach((route, rule) -> routeWide.put(route, bucket(limit * rule.routeWideMultiple())));
    }

    /** Limite por visitante, por minuto. */
    public int limit() {
        return limit;
    }

    /** Teto geral de uma rota, por minuto, somando todos os visitantes. */
    public int routeWideLimit(String route) {
        return limit * RULES.get(route).routeWideMultiple();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String route = RULES.keySet().stream().filter(uri::endsWith).findFirst().orElse(null);
        if (route == null) {
            chain.doFilter(request, response);
            return;
        }

        Rule rule = RULES.get(route);
        Counter counter = perVisitor.computeIfAbsent(route + "|" + clientIp.resolve(request),
                key -> new Counter(bucket(limit * rule.perVisitorMultiple()), new AtomicLong()));
        counter.lastUse().set(System.nanoTime());
        if (perVisitor.size() > MAX_COUNTERS) {
            cleanIdleCounters();
        }

        // Primeiro o do visitante: quem já estourou o próprio limite não gasta o teto geral.
        if (counter.bucket().tryConsume(1) && routeWide.get(route).tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }

        ErrorPayload payload = new ErrorPayload(
                ErrorCode.RATE_LIMIT_EXCEEDED.name(), "Limite de requisições excedido",
                ErrorCode.RATE_LIMIT_EXCEEDED.httpStatus(), request.getRequestURI(),
                MDC.get(TraceIdFilter.MDC_KEY), Instant.now().toString(), List.of());
        response.setStatus(ErrorCode.RATE_LIMIT_EXCEEDED.httpStatus());
        response.setHeader("Retry-After", String.valueOf(WINDOW.toSeconds()));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), ApiResponse.error(payload));
    }

    private static Bucket bucket(int capacity) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillGreedy(capacity, WINDOW).build())
                .build();
    }

    /** Apaga contadores ociosos; se nem assim couber, zera tudo. Uma limpeza por vez. */
    private void cleanIdleCounters() {
        if (!cleaning.compareAndSet(false, true)) {
            return;
        }
        try {
            long cutoff = System.nanoTime() - WINDOW.toNanos();
            perVisitor.entrySet().removeIf(entry -> entry.getValue().lastUse().get() < cutoff);
            if (perVisitor.size() > MAX_COUNTERS) {
                log.warn("Contadores de limite acima de {} mesmo após a limpeza; zerando.", MAX_COUNTERS);
                perVisitor.clear();
            }
        } finally {
            cleaning.set(false);
        }
    }
}
