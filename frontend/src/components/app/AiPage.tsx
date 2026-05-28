import { AiBrain01Icon } from "@hugeicons/core-free-icons"

import { AiAnalysisPanel } from "@/components/app/AiAnalysisPanel"
import { ProductIcon } from "@/components/app/ProductIcon"
import { useDashboardData } from "@/components/app/dashboard-data"

export function AiPage() {
  const { activeSnapshot, regionReadModelLoading } = useDashboardData()

  return (
    <main className="mx-auto grid max-w-4xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ProductIcon icon={AiBrain01Icon} size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">AI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Advanced AI workflows are reserved for the next backend pass after this
              UI cleanup.
            </p>
          </div>
        </div>
      </section>
      <AiAnalysisPanel
        snapshot={activeSnapshot}
        snapshotLoading={regionReadModelLoading}
      />
    </main>
  )
}
