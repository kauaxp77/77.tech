import { login } from './actions'
import { ShieldAlert } from 'lucide-react'

export const metadata = {
    title: 'Autenticação Restrita | 77xp',
}

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
    const searchParams = await props.searchParams;
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--color-primary)]/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md z-10 glass border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <ShieldAlert className="text-[var(--color-primary)]" size={32} />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Acesso Classificado</h1>
                    <p className="text-sm text-white/50">Insira suas credenciais corporativas da 77xp Tech Solutions para prosseguir.</p>
                </div>

                <form className="flex flex-col gap-5">
                    {searchParams?.error === 'true' && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                            Credenciais inválidas ou acesso não autorizado.
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest pl-1">E-mail Operacional</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="tecnologia@77xp.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest pl-1">Chave Mestra (Senha)</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <button formAction={login} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white font-medium py-4 rounded-xl mt-4 transition-all">
                        Estabelecer Conexão
                    </button>

                    <p className="text-center text-xs text-white/30 mt-6">
                        Toda tentativa de acesso é rigorosamente registrada. <br /> Retorne caso não possua liberação.
                    </p>
                </form>
            </div>
        </div>
    )
}
