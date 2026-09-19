import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './app/AuthProvider'
import { QueryProvider } from './app/QueryProvider'
import { RequireAuth } from './app/RequireAuth'
import { RequireRole } from './app/RequireRole'
import { PanelLayout } from './layout/PanelLayout'
import { Entrar } from './pages/auth/Entrar'
import { EsqueciSenha } from './pages/auth/EsqueciSenha'
import { PrimeiroAcesso } from './pages/auth/PrimeiroAcesso'
import { RedefinirSenha } from './pages/auth/RedefinirSenha'
import { Conta } from './pages/panel/Conta'
import { VisaoGeral } from './pages/panel/VisaoGeral'

/** Só as seções que já existem; o menu cresce junto com o sistema. */
const PANEL_MENU = [
  { to: '/painel', label: 'Visão geral' },
  { to: '/painel/conta', label: 'Minha conta' },
]

function Painel() {
  return (
    <RequireAuth>
      <RequireRole allow={['OWNER', 'ADMIN', 'TEAM']}>
        {/* userName fica de fora: a Visão geral já cumprimenta pelo nome e repetir
            o nome duas vezes na mesma tela é ruído. */}
        <PanelLayout items={PANEL_MENU} title="Painel" userName={null}>
          <Outlet />
        </PanelLayout>
      </RequireRole>
    </RequireAuth>
  )
}

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
            <Route path="/painel" element={<Painel />}>
              <Route index element={<VisaoGeral />} />
              <Route path="conta" element={<Conta />} />
            </Route>
            {/* Área do cliente e página inicial chegam nas próximas tarefas. */}
            <Route path="*" element={<Navigate to="/entrar" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}
