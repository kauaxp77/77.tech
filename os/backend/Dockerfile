# Imagem do backend do 77xp OS.
#
# Duas etapas: a primeira compila com o JDK e o Maven, a segunda roda com o JRE só.
# A imagem final não carrega Maven, código-fonte nem repositório de dependências.
#
# Os testes NÃO rodam aqui, e isso é de propósito: a suíte usa Testcontainers, que
# precisa de um Docker, e não há Docker dentro de um `docker build`. Quem roda os
# testes é o CI (.github/workflows/os-backend.yml), e o deploy só sai de branch verde.

# ---------- etapa 1: compilar ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# O pom sozinho primeiro: enquanto ele não mudar, o Docker reaproveita as dependências
# baixadas e o build seguinte leva segundos em vez de minutos.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests \
    && mv target/*.jar /build/app.jar

# ---------- etapa 2: rodar ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Usuário sem privilégios. Se alguém escapar da aplicação, escapa para um usuário que
# não pode escrever em lugar nenhum — nem na própria imagem.
RUN addgroup -S xp77 && adduser -S -G xp77 -H -s /sbin/nologin xp77

COPY --from=build --chown=xp77:xp77 /build/app.jar /app/app.jar
USER xp77

EXPOSE 8080

# MaxRAMPercentage: a JVM enxerga o limite do container, não o da máquina.
# Xss512k: 120 threads do Tomcat × 1 MB de pilha padrão é memória jogada fora.
# ExitOnOutOfMemoryError é o que mais importa: sem ele, um vazamento deixa o serviço
# vivo e inútil, respondendo devagar para sempre. Com ele, o processo morre e o Render
# sobe outro.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -Xss512k -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
