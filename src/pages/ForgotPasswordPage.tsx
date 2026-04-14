import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiKey, FiMail } from "react-icons/fi";
import { requestPasswordReset, resetPassword } from "../lib/auth";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = await requestPasswordReset({ email });
      setMessage(payload.message);
      setStage("reset");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start password reset right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Your new passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = await resetPassword({ email, token: code, password });
      setMessage(payload.message);
      setTimeout(() => navigate("/auth", { replace: true }), 900);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset the password right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[28rem] items-center">
        <section className="panel-surface w-full rounded-[28px] px-5 py-6 sm:px-7 sm:py-8">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <p className="caption-label mt-5">
            {stage === "request" ? "Forgot password" : "Reset password"}
          </p>
          <h1 className="headline-display mt-2 text-3xl font-semibold leading-tight sm:text-[2.2rem]">
            {stage === "request"
              ? "Reset your BALVIS password"
              : "Choose a new password"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
            {stage === "request"
              ? "Enter your email and we’ll start a password reset request for your account."
              : "Enter the reset code you received and a new password to get back into your workspace."}
          </p>

          {stage === "request" ? (
            <form onSubmit={handleRequest} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Email
                </span>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]" />
                  <input
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 py-3 pl-11 pr-4 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                    placeholder="you@example.com"
                    required
                  />
                </div>
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
                {submitting ? "Preparing reset" : "Send reset code"}
                <FiArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
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
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Reset code
                </span>
                <div className="relative">
                  <FiKey className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]" />
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 py-3 pl-11 pr-4 uppercase tracking-[0.2em] text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                    placeholder="ABC123"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  New password
                </span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                  placeholder="At least 12 characters"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Confirm new password
                </span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
                  placeholder="Repeat your new password"
                  required
                />
              </label>

              {(error || message) && (
                <div
                  className={`rounded-[18px] px-4 py-3 text-sm ${
                    error
                      ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-100"
                  }`}
                >
                  {error || message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[color:var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Updating password" : "Update password"}
                <FiArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {message && stage === "request" && !error && (
            <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-100">
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
