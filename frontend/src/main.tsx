import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { AppProviders } from "@/app/providers.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>
)
