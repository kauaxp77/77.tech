// Utilitário de teste: lê o destino de um redirect() do Next.js.
// O redirect() lança um erro cujo digest tem o formato
// "NEXT_REDIRECT;<tipo>;<destino>;<status>;".
export function redirectTarget(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('digest' in error)) return null
    const digest = (error as { digest: unknown }).digest
    if (typeof digest !== 'string' || !digest.startsWith('NEXT_REDIRECT;')) return null
    return digest.split(';').slice(2, -2).join(';')
}

export async function captureRedirect(run: () => Promise<unknown>): Promise<string> {
    try {
        await run()
    } catch (error) {
        const target = redirectTarget(error)
        if (target !== null) return target
        throw error
    }
    throw new Error('Esperava um redirect(), mas a função terminou sem redirecionar.')
}
