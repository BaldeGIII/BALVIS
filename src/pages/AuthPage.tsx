import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import {
  fetchAuthStatus,
  loginAccount,
  registerAccount,
} from "../lib/auth";

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
          return;
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
        <div className="panel-strong rounded-[28px] px-6 py-5 text-sm text-[color:var(--muted)]">
          Checking account status...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-surface flex flex-col justify-between rounded-[30px] px-6 py-7 sm:px-8 sm:py-9">
          <div>
            <p className="caption-label">BALVIS</p>
            <h1 className="headline-display mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Study in a focused workspace that remembers your progress.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              Sign in once, then return to your notes, summaries, videos, and
              whiteboard work from the same account.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Account-backed history",
                detail: "Conversations sync to your account instead of one browser.",
              },
              {
                title: "Cleaner routing",
                detail: "Auth, workspace, and settings now live on separate pages.",
              },
              {
                title: "Security-first",
                detail: "OWASP and NIST-inspired guardrails are built into the app flow.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="panel-strong rounded-[22px] p-4"
              >
                <h2 className="text-sm font-semibold text-[color:var(--text)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-strong flex flex-col justify-center rounded-[30px] px-5 py-6 sm:px-6">
          <p className="caption-label">
            {mode === "login" ? "Sign in" : "Create account"}
          </p>
          <h2 className="headline-display mt-2 text-3xl font-semibold leading-tight">
            {mode === "login"
              ? "Pick up right where you left off"
              : "Create your BALVIS account"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
            {mode === "login"
              ? "Your conversations, tabs, and study flow will load after you sign in."
              : "Once your account is created, your study sessions will save to the database automatically."}
          </p>

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

          <p className="mt-5 text-sm leading-6 text-[color:var(--muted)]">
            Want to review your preferences later? Your account settings will be
            available at{" "}
            <code className="rounded bg-white/60 px-1.5 py-0.5 text-[color:var(--text)] dark:bg-black/10">
              /settings
            </code>{" "}
            after sign-in.
          </p>

        </section>
      </div>
    </div>
  );
}

export default AuthPage;
