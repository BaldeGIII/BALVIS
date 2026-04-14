import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { fetchAuthStatus, loginAccount, registerAccount } from "../lib/auth";

type AuthMode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mode: AuthMode =
    searchParams.get("mode") === "register" ? "register" : "login";

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const payload = await fetchAuthStatus();
        if (!cancelled && payload.authenticated) {
          navigate("/app", { replace: true });
        }
      } catch (authError) {
        console.error("Auth page status check failed:", authError);
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
  }, [navigate]);

  const switchMode = (nextMode: AuthMode) => {
    setError("");
    setPassword("");
    setName("");
    setSearchParams(nextMode === "register" ? { mode: "register" } : {});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        await registerAccount({ name, email, password });
      } else {
        await loginAccount({ email, password });
      }

      navigate("/app", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to continue right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10 text-[color:var(--text)]">
        <div className="panel-strong rounded-[24px] px-5 py-4 text-sm text-[color:var(--muted)]">
          Checking account status...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[28rem] items-center">
        <section className="panel-surface w-full rounded-[28px] px-5 py-6 sm:px-7 sm:py-8">
          <div>
            <p className="caption-label">BALVIS</p>
            <h1 className="headline-display mt-2 text-[2rem] font-semibold leading-tight sm:text-[2.35rem]">
              {mode === "login"
                ? "Sign in and keep studying"
                : "Create your account"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {mode === "login"
                ? "Open your workspace and pick up where you left off."
                : "Create your account and your study sessions will save automatically."}
            </p>
          </div>

          <div className="mt-5 flex gap-2 rounded-full bg-white/55 p-1 dark:bg-black/10">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Name
                </span>
                <input
                  autoComplete="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                  placeholder="Your name"
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                Email
              </span>
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                Password
              </span>
              <input
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                placeholder="At least 12 characters"
                required
              />
            </label>

            {mode === "login" && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[color:var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? mode === "login"
                  ? "Signing in"
                  : "Creating account"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              <FiArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;
