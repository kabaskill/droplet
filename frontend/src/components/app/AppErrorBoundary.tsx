import { Alert01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { Component, type ErrorInfo, type ReactNode } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Droplet UI boundary caught an error", error, errorInfo)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="flex min-h-svh bg-muted/40 p-4 text-foreground">
        <section className="m-auto w-full max-w-md rounded-md border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
              <ProductIcon icon={Alert01Icon} />
            </span>
            <div className="min-w-0">
              <h1 className="font-semibold">Workspace unavailable</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Droplet hit an interface error while rendering the operational
                workspace.
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            {this.state.error.message}
          </div>

          <Button className="w-full" onClick={() => window.location.reload()}>
            <ProductIcon icon={RefreshIcon} />
            Reload workspace
          </Button>
        </section>
      </main>
    )
  }
}
