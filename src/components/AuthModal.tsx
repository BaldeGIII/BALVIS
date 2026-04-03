import React, { useEffect, useState } from "react";
import { FiArrowRight, FiX } from "react-icons/fi";
import { apiUrl } from "../lib/api";

type AuthMode = "login" | "register";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthModalProps {
  initialMode: AuthMode;
  open: boolean;
  onAuthSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  open,
  onAuthSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      setPassword("");
    }
  }, [initialMode, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        apiUrl(mode === "login" ? "/auth/login" : "/auth/register"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const responseText = await response.text();
      let payload: { error?: string; user?: AuthUser } = {};

      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        payload = {
          error: "The server returned an unexpected response. Please try again.",
        };
      }

      if (!response.ok) {
        throw new Error(payload.error || "Unable to continue right now.");
      }

      if (!payload.user) {
        throw new Error("The server did not return account details.");
      }

      onAuthSuccess(payload.user);
      onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm">
      <div className="panel-strong w-full max-w-md rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="caption-label">
              {mode === "login" ? "Sign in" : "Create account"}
            </p>
            <h2 className="headline-display mt-2 text-2xl font-semibold text-[color:var(--text)]">
              {mode === "login"
                ? "Pick up where you left off"
                : "Save every study session"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Your conversations will sync to your account instead of staying on
              one browser only.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-white/70 text-[color:var(--muted)] transition hover:bg-white hover:text-[color:var(--text)] dark:bg-black/10"
            title="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                Name
              </span>
              <input
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
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
              placeholder="At least 8 characters"
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

        <div className="mt-4 text-sm text-[color:var(--muted)]">
          {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-semibold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
