import { AiBrain01Icon } from "@hugeicons/core-free-icons"
import type { UseMutationResult } from "@tanstack/react-query"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { cn } from "@/lib/utils"
import type {
  AiAnalysisRequest,
  AiAnalysisResult,
  ReservoirSnapshot,
} from "@/services/types"

type AiAnalysisPanelProps = {
  analysis?: UseMutationResult<
    AiAnalysisResult,
    Error,
    AiAnalysisRequest | ReservoirSnapshot
  >
  request?: AiAnalysisRequest | null
  showAction?: boolean
  storedAnalysis?: AiAnalysisResult | null
  snapshotLoading?: boolean
  snapshot?: ReservoirSnapshot | null
}

export function AiAnalysisPanel({
  analysis,
  request = null,
  showAction = true,
  snapshot,
  snapshotLoading = false,
  storedAnalysis = null,
}: AiAnalysisPanelProps) {
  const canAnalyze = useAuthStore((state) =>
    state.hasAnyRole(["citizen", "analyst", "municipality"])
  )
  const snapshotRequest = snapshot
    ? {
        generatedAt: new Date().toISOString(),
        regions: [],
        scope: {
          id: snapshot.regionId,
          label: snapshot.regionId,
          type: "state" as const,
        },
        snapshots: [snapshot],
      }
    : null
  const activeRequest = request ?? snapshotRequest
  const activeAnalysis = storedAnalysis ?? analysis?.data ?? null

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Analysis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured observations from the current snapshot
          </p>
        </div>
        {showAction ? (
          <Button
            disabled={
              !analysis ||
              !activeRequest ||
              snapshotLoading ||
              !canAnalyze ||
              analysis.isPending
            }
            size="sm"
            variant="outline"
            onClick={() => activeRequest && analysis?.mutate(activeRequest)}
          >
            <ProductIcon icon={AiBrain01Icon} />
            Analyze
          </Button>
        ) : null}
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
            Authenticated Droplet role required.
          </p>
        ) : analysis?.isPending ? (
          <div className="grid gap-2">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
          </div>
        ) : analysis?.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
            <div className="font-medium">Analysis unavailable</div>
            <div className="mt-1">{analysis.error.message}</div>
          </div>
        ) : activeAnalysis ? (
          <div className="space-y-3">
            <div>
              <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium capitalize">
                {activeAnalysis.riskLevel} risk
              </span>
              {activeAnalysis.scopeLabel ? (
                <span className="ml-2 rounded-md border bg-background px-2 py-1 text-xs font-medium">
                  {activeAnalysis.scopeLabel}
                </span>
              ) : null}
              <p className="mt-3 text-sm leading-6">{activeAnalysis.summary}</p>
            </div>
            {activeAnalysis.observations?.length ? (
              <div>
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Observations
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {activeAnalysis.observations.map((observation, index) => (
                    <li
                      className="rounded-md border bg-background px-3 py-2"
                      key={`${observation}-${index}`}
                    >
                      {observation}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Recommendations
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {activeAnalysis.recommendations.map((recommendation, index) => (
                  <li
                    className="rounded-md bg-muted px-3 py-2"
                    key={`${recommendation}-${index}`}
                  >
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {activeRequest
              ? "Run analysis for the selected water-state scope."
              : "Waiting for selected state data."}
          </p>
        )}
      </div>
    </section>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}
