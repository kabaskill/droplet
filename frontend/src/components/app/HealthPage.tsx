import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { ReadModelFreshnessPanel } from "@/components/app/ReadModelFreshnessPanel"
import { SourceHealthPanel } from "@/components/app/SourceHealthPanel"
import {
  useDashboardData,
  panelErrorMessage,
  retryReadModels,
} from "@/components/app/dashboard-data"

export function HealthPage() {
  const {
    freshnessItems,
    ingestionStatusQuery,
    regions,
    sourceHealthQuery,
  } = useDashboardData()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(0)
  const sourceHealthLoading = sourceHealthQuery.isPending && !sourceHealthQuery.data
  const ingestionStatusLoading =
    ingestionStatusQuery.isPending && !ingestionStatusQuery.data

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 0)
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <main className="mx-auto grid max-w-7xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
      <SourceHealthPanel
        errorMessage={panelErrorMessage(sourceHealthQuery.error)}
        ingestionStatus={ingestionStatusQuery.data ?? null}
        ingestionStatusLoading={ingestionStatusLoading}
        loading={sourceHealthLoading}
        regions={regions}
        sourceHealth={sourceHealthQuery.data ?? null}
      />
      <ReadModelFreshnessPanel
        items={freshnessItems}
        now={now}
        onRetry={() => retryReadModels(queryClient)}
      />
    </main>
  )
}
