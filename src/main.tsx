import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/print.css";

// Force re-render on HMR
createRoot(document.getElementById("root")!).render(<App />);
