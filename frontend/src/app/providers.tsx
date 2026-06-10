import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import type { ReactNode } from "react"

import { queryClient } from "@/app/query-client"
import { AuthProvider } from "@/features/auth/AuthProvider"

const readModelVersion = "state-model-v2"
const persistenceVersion = `${readModelVersion}-climate-model-v3`

const persister = createSyncStoragePersister({
  key: `droplet-query-cache-${persistenceVersion}`,
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
        buster: persistenceVersion,
        maxAge: 1000 * 60 * 60 * 24,
        persister,
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </PersistQueryClientProvider>
  )
}
