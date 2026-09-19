import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../api/ApiError'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 401 e 403 não melhoram tentando de novo: o cliente HTTP já renovou o que dava.
            retry: (failureCount, error) =>
              error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
