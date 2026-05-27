import { QueryClient } from "@tanstack/react-query"

import { isDropletApiError } from "@/services/api"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
      refetchOnReconnect: true,
      retry: retryQuery,
      staleTime: 1000 * 60 * 2,
    },
    mutations: {
      networkMode: "offlineFirst",
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
  if (!isDropletApiError(error)) {
    return true
  }

  return error.status >= 500
}
