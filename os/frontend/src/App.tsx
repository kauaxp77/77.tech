import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './app/AuthProvider'
import { QueryProvider } from './app/QueryProvider'
import { Entrar } from './pages/auth/Entrar'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<Entrar />} />
            {/* As demais rotas chegam nas próximas tarefas do plano 2. */}
            <Route path="*" element={<Navigate to="/entrar" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  )
}
