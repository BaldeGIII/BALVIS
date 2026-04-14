import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { initializeTheme } from "./lib/theme";
import "./index.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </React.StrictMode>
);
