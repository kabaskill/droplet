import { QueryClientProvider } from "@tanstack/react-query"
import { useEffect, type ReactNode } from "react"
import { queryClient } from "@/app/query-client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/features/auth/AuthProvider"
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("droplet-query-cache-"))
        window.localStorage.removeItem(key)
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>{children}</AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
