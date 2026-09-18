#!/bin/sh
# Testa os scripts SQL da correção do admin num Postgres descartável.
# Rode na raiz do repositório:
#   docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust \
#     -v "$PWD/supabase/hotfix/admin-app-metadata:/sql:ro" postgres:17-alpine sh /sql/teste/rodar.sh
set -eu

docker-entrypoint.sh postgres > /tmp/postgres.log 2>&1 &
# O servidor temporário da inicialização não escuta em TCP: esperar pelo TCP garante o servidor final.
until pg_isready -h 127.0.0.1 -U postgres -q; do sleep 0.5; done

PSQL="psql -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

$PSQL -f /sql/teste/preparar-banco.sql

echo "1) Passo 2 antes do passo 1 precisa parar sozinho (proteção contra ficar trancado fora)"
if $PSQL -f /sql/2-trocar-regras.sql 2> /tmp/erro.txt; then
    echo "FALHOU: o passo 2 rodou sem nenhuma conta marcada como admin"; exit 1
fi
if ! grep -q "Rode o PASSO 1" /tmp/erro.txt; then
    echo "FALHOU: o passo 2 parou por outro motivo:"; cat /tmp/erro.txt; exit 1
fi

echo "2) Passo 1 marca a conta admin"
sed "s/seu-email@exemplo.com/admin@77xp.com/" /sql/1-marcar-admin.sql > /tmp/passo1.sql
$PSQL -f /tmp/passo1.sql > /dev/null

echo "3) Passo 2 troca as regras de acesso"
$PSQL -f /sql/2-trocar-regras.sql > /dev/null

echo "4) Quem acessa o quê"
$PSQL -f /sql/teste/verificar.sql

echo "5) Rodar o passo 2 de novo não quebra nada"
$PSQL -f /sql/2-trocar-regras.sql > /dev/null
$PSQL -f /sql/teste/verificar.sql

echo "OK: todos os testes dos scripts SQL passaram"
