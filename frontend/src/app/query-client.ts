import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
      refetchOnReconnect: true,
      retry: 2,
      staleTime: 1000 * 60 * 2,
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
})
