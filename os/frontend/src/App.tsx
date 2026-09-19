import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './app/AuthProvider'
import { QueryProvider } from './app/QueryProvider'
import { RequireAuth } from './app/RequireAuth'
import { RequireRole } from './app/RequireRole'
import type { Role } from './api/types'
import { PanelLayout } from './layout/PanelLayout'
import { Entrar } from './pages/auth/Entrar'
import { EsqueciSenha } from './pages/auth/EsqueciSenha'
import { PrimeiroAcesso } from './pages/auth/PrimeiroAcesso'
import { RedefinirSenha } from './pages/auth/RedefinirSenha'
import { Conta } from './pages/account/Conta'
import { ContasDeAcesso } from './pages/panel/ContasDeAcesso'
import { Orcamento } from './pages/panel/Orcamento'
import { Precos } from './pages/panel/Precos'
import { Inicio } from './pages/portal/Inicio'
import { Home } from './pages/public/Home'
import { VisaoGeral } from './pages/panel/VisaoGeral'

/** Quem mexe em contas de acesso: a API só deixa estes dois em /admin/users. */
const GERENTES_DE_CONTA: Role[] = ['OWNER', 'ADMIN']

function MenuDoPainel() {
  const { me } = useAuth()
  const podeGerirContas = me !== null && GERENTES_DE_CONTA.includes(me.role)

  // Só as seções que já existem, e só as que esta conta pode abrir.
  const itens = [
    { to: '/painel', label: 'Visão geral' },
    ...(podeGerirContas
      ? [
          { to: '/painel/orcamento', label: 'Montar orçamento' },
          { to: '/painel/precos', label: 'Tabela de preços' },
          { to: '/painel/contas', label: 'Contas de acesso' },
        ]
      : []),
    { to: '/painel/conta', label: 'Minha conta' },
  ]

  // userName fica de fora: a Visão geral já cumprimenta pelo nome e repetir
  // o nome duas vezes na mesma tela é ruído.
  return (
    <PanelLayout items={itens} title="Painel" userName={null}>
      <Outlet />
    </PanelLayout>
  )
}

/**
 * Área do cliente: mesma estrutura do painel, menu próprio. Nada de administração
 * aparece aqui — e a API recusaria de qualquer jeito, porque /admin/** é OWNER e ADMIN.
 */
const MENU_DO_CLIENTE = [
  { to: '/minha-conta', label: 'Início' },
  { to: '/minha-conta/conta', label: 'Minha conta' },
]

function AreaDoCliente() {
  return (
    <RequireAuth>
      <RequireRole allow={['CLIENT']}>
        <PanelLayout items={MENU_DO_CLIENTE} title="Área do cliente" userName={null}>
          <Outlet />
        </PanelLayout>
      </RequireRole>
    </RequireAuth>
  )
}

function Painel() {
  return (
    <RequireAuth>
      <RequireRole allow={['OWNER', 'ADMIN', 'TEAM']}>
        <MenuDoPainel />
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
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/esqueci-a-senha" element={<EsqueciSenha />} />
            <Route path="/painel" element={<Painel />}>
              <Route index element={<VisaoGeral />} />
              <Route
                path="orcamento"
                element={
                  <RequireRole allow={GERENTES_DE_CONTA}>
                    <Orcamento />
                  </RequireRole>
                }
              />
              <Route
                path="precos"
                element={
                  <RequireRole allow={GERENTES_DE_CONTA}>
                    <Precos />
                  </RequireRole>
                }
              />
              <Route
                path="contas"
                element={
                  <RequireRole allow={GERENTES_DE_CONTA}>
                    <ContasDeAcesso />
                  </RequireRole>
                }
              />
              <Route path="conta" element={<Conta />} />
            </Route>
            <Route path="/minha-conta" element={<AreaDoCliente />}>
              <Route index element={<Inicio />} />
              <Route path="conta" element={<Conta />} />
            </Route>
            <Route path="*" element={<Navigate to="/entrar" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}
