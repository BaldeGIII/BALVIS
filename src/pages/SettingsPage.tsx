import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit3,
  FiFileText,
  FiShield,
  FiSliders,
} from "react-icons/fi";
import {
  fetchAuthStatus,
  logoutAccount,
  type AuthUser,
} from "../lib/auth";

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const payload = await fetchAuthStatus();

        if (!cancelled) {
          if (!payload.authenticated || !payload.user) {
            navigate("/auth", { replace: true });
            return;
          }

          setUser(payload.user);
        }
      } catch (error) {
        console.error("Unable to load settings:", error);
        if (!cancelled) {
          navigate("/auth", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } catch (error) {
      console.error("Unable to sign out:", error);
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10 text-[color:var(--text)]">
        <div className="panel-strong rounded-[28px] px-6 py-5 text-sm text-[color:var(--muted)]">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="caption-label">Settings</p>
            <h1 className="headline-display mt-2 text-4xl font-semibold">
              Account and security
            </h1>
          </div>

          <Link
            to="/app"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="panel-surface rounded-[28px] p-6">
          <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <FiSliders className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  Account profile
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  These details are tied to your database-backed BALVIS account.
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Name
                </dt>
                <dd className="mt-1 text-base text-[color:var(--text)]">
                  {user?.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Email
                </dt>
                <dd className="mt-1 text-base text-[color:var(--text)]">
                  {user?.email}
                </dd>
              </div>
              {user?.createdAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Account created
                  </dt>
                  <dd className="mt-1 text-base text-[color:var(--text)]">
                    {new Date(user.createdAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            >
              Sign out
            </button>
          </section>

          <section className="panel-strong rounded-[28px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <FiShield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  Security posture
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  BALVIS is being aligned with practical OWASP and NIST guidance.
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
              <li>
                Account sessions are cookie-based and required for database sync.
              </li>
              <li>
                CSRF tokens are required for sign-in, sign-out, and account-backed conversation saves.
              </li>
              <li>
                Conversations are stored server-side per user instead of only in
                browser storage.
              </li>
              <li>
                Prompt-injection and unsafe instruction handling are being
                filtered at the backend layer.
              </li>
              <li>
                Local development allows only local origins; production should
                pin exact trusted origins and secrets.
              </li>
            </ul>

            <div className="mt-6 grid gap-3">
              <Link
                to="/security"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              >
                <FiShield className="h-4 w-4" />
                View security standards
              </Link>
              <Link
                to="/app/summarize"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              >
                <FiFileText className="h-4 w-4" />
                Open summarizer route
              </Link>
              <Link
                to="/app/whiteboard"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              >
                <FiEdit3 className="h-4 w-4" />
                Open whiteboard route
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
