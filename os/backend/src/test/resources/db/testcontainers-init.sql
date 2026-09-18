-- Papel da aplicação nos testes. Existe ANTES do Flyway, como no Supabase (onde o
-- passo a passo de publicação cria o papel com senha). A V4 só o cria se não existir.
CREATE ROLE app_77xp LOGIN PASSWORD 'app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
