import { AiBrain01Icon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { useAiAnalysis } from "@/hooks/use-droplet-data"
import { cn } from "@/lib/utils"
import type { ReservoirSnapshot } from "@/services/types"

type AiAnalysisPanelProps = {
  snapshotLoading?: boolean
  snapshot: ReservoirSnapshot | null
}

export function AiAnalysisPanel({
  snapshot,
  snapshotLoading = false,
}: AiAnalysisPanelProps) {
  const canAnalyze = useAuthStore((state) =>
    state.hasAnyRole(["analyst", "municipality"])
  )
  const analysis = useAiAnalysis()

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Analysis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured observations from the current snapshot
          </p>
        </div>
        <Button
          disabled={!snapshot || snapshotLoading || !canAnalyze || analysis.isPending}
          size="sm"
          variant="outline"
          onClick={() => snapshot && analysis.mutate(snapshot)}
        >
          <ProductIcon icon={AiBrain01Icon} />
          Analyze
        </Button>
      </div>

      <div className="mt-4 rounded-md border bg-background p-3">
        {snapshotLoading ? (
          <div className="grid gap-2">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
        ) : !canAnalyze ? (
          <p className="text-sm text-muted-foreground">
            Analyst or municipality role required.
          </p>
        ) : analysis.isPending ? (
          <div className="grid gap-2">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
          </div>
        ) : analysis.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
            <div className="font-medium">Analysis unavailable</div>
            <div className="mt-1">{analysis.error.message}</div>
          </div>
        ) : analysis.data ? (
          <div className="space-y-3">
            <div>
              <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium capitalize">
                {analysis.data.riskLevel} risk
              </span>
              <p className="mt-3 text-sm leading-6">{analysis.data.summary}</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {analysis.data.recommendations.map((recommendation, index) => (
                <li
                  className="rounded-md bg-muted px-3 py-2"
                  key={`${recommendation}-${index}`}
                >
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {snapshot
              ? "Run analysis for the selected region snapshot."
              : "Waiting for a selected region snapshot."}
          </p>
        )}
      </div>
    </section>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}
