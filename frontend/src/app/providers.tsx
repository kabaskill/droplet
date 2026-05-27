import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import type { ReactNode } from "react"

import { queryClient } from "@/app/query-client"
import { AuthProvider } from "@/features/auth/AuthProvider"

const persister = createSyncStoragePersister({
  key: "droplet-query-cache",
  storage: window.localStorage,
})

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        maxAge: 1000 * 60 * 60 * 24,
        persister,
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </PersistQueryClientProvider>
  )
}
