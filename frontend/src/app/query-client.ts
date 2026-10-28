import { QueryClient } from "@tanstack/react-query"

import { WaterApiError } from "@/services/water-api"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "online",
      refetchOnReconnect: true,
      retry: retryQuery,
      staleTime: 1000 * 60 * 2,
    },
    mutations: {
      networkMode: "online",
      retry: retryMutation,
    },
  },
})

function retryQuery(failureCount: number, error: unknown) {
  return shouldRetry(error) && failureCount < 2
}

function retryMutation(failureCount: number, error: unknown) {
  return shouldRetry(error) && failureCount < 1
}

function shouldRetry(error: unknown) {
  if (!(error instanceof WaterApiError)) {
    return true
  }

  return error.status >= 500
}
