import { useEffect, type ReactNode } from "react"

import { useAuthStore } from "@/features/auth/auth-store"

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return children
}
