import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './app/AuthProvider'
import { QueryProvider } from './app/QueryProvider'
import { Entrar } from './pages/auth/Entrar'
import { EsqueciSenha } from './pages/auth/EsqueciSenha'
import { PrimeiroAcesso } from './pages/auth/PrimeiroAcesso'
import { RedefinirSenha } from './pages/auth/RedefinirSenha'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
            {/* Painel, Área do cliente e página inicial chegam nas próximas tarefas. */}
            <Route path="*" element={<Navigate to="/entrar" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}
