import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import App from "./App";
import { fetchAuthStatus } from "./lib/auth";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";

function FullScreenStatus({ message }: { message: string }) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10 text-[color:var(--text)]">
      <div className="panel-strong rounded-[28px] px-6 py-5 text-sm text-[color:var(--muted)]">
        {message}
      </div>
    </div>
  );
}

function useAuthGate() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const payload = await fetchAuthStatus();

        if (!cancelled) {
          setAuthenticated(Boolean(payload.authenticated));
        }
      } catch (error) {
        console.error("Route auth check failed:", error);
        if (!cancelled) {
          setAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, authenticated };
}

function ProtectedRoute() {
  const { loading, authenticated } = useAuthGate();

  if (loading) {
    return <FullScreenStatus message="Loading your workspace..." />;
  }

  return authenticated ? <Outlet /> : <Navigate to="/auth" replace />;
}

function GuestRoute() {
  const { loading, authenticated } = useAuthGate();

  if (loading) {
    return <FullScreenStatus message="Loading..." />;
  }

  return authenticated ? <Navigate to="/app" replace /> : <Outlet />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route element={<GuestRoute />}>
          <Route path="/auth" element={<AuthPage />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app/*" element={<App />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/security" element={<SecurityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
