// Utilitário de teste: cliente Supabase falso que registra as consultas e
// devolve respostas no mesmo formato do PostgREST ({ data, error, count, status, statusText }).
export type FakeResult = {
    data: unknown
    error: { message: string; code?: string; details?: string; hint?: string } | null
    count?: number | null
    status?: number
    statusText?: string
}

export type RecordedQuery = { table: string; ops: Array<[string, ...unknown[]]> }

export function createFakeSupabase(resultsByTable: Record<string, FakeResult>) {
    const queries: RecordedQuery[] = []

    function from(table: string) {
        const query: RecordedQuery = { table, ops: [] }
        queries.push(query)
        const result = resultsByTable[table] ?? {
            data: null,
            error: { message: `fake: tabela "${table}" sem resposta configurada` },
        }
        const response = {
            count: null,
            status: result.error ? 400 : 200,
            statusText: result.error ? 'Bad Request' : 'OK',
            ...result,
        }

        // Qualquer método encadeado (select, eq, update...) é registrado e devolve o próprio builder;
        // o await resolve com a resposta configurada, como o PostgrestBuilder real.
        const builder: object = new Proxy(
            {},
            {
                get(_target, prop) {
                    if (prop === 'then') {
                        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
                            Promise.resolve(response).then(resolve, reject)
                    }
                    return (...args: unknown[]) => {
                        query.ops.push([String(prop), ...args])
                        return builder
                    }
                },
            },
        )
        return builder
    }

    return { client: { from }, queries }
}
