import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initObservability } from "@/lib/observability";
import "./index.css";
import "./styles/print.css";

// Inert without a production VITE_SENTRY_DSN — see src/lib/observability.ts.
initObservability();

// Force re-render on HMR
createRoot(document.getElementById("root")!).render(<App />);
