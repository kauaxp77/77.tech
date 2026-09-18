-- Só para o ambiente local (docker compose). Roda uma única vez, quando o volume
-- do Postgres é criado. Cria o papel com que a aplicação conecta ANTES do Flyway:
-- a V4 só cria o papel se ele não existir e nunca define senha. Em teste e
-- oficial (Supabase) o papel é criado pelo passo a passo de publicação (plano 3).
CREATE ROLE app_77xp LOGIN PASSWORD 'app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
