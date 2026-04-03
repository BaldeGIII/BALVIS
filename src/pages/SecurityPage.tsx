import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiLock,
  FiShield,
  FiTarget,
} from "react-icons/fi";

const SECURITY_CONTROLS = [
  "Separate account, workspace, settings, and security routes",
  "Cookie-based sessions for authenticated database sync",
  "CSRF token checks on auth changes and conversation sync",
  "Session regeneration on sign-in and account creation",
  "Backend rate limiting on auth and AI-heavy endpoints",
  "Prompt-injection rejection for direct attempts to override BALVIS",
  "Untrusted-content wrapping for summaries and retrieved material",
  "Security headers applied at the HTTP layer",
];

const STANDARDS = [
  {
    title: "OWASP LLM guidance",
    detail:
      "Used as a practical baseline for prompt-injection resistance, secret handling, and keeping model behavior inside clear boundaries.",
    icon: FiShield,
  },
  {
    title: "NIST AI risk management",
    detail:
      "Used to guide safer deployment decisions, trustworthy behavior, and clearer risk controls around the model workflow.",
    icon: FiTarget,
  },
  {
    title: "Secure session design",
    detail:
      "Authentication, cookie handling, and server-side persistence are being treated as first-class security features instead of frontend-only behavior.",
    icon: FiLock,
  },
];

function SecurityPage() {
  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="caption-label">Security</p>
            <h1 className="headline-display mt-2 text-4xl font-semibold">
              Standards and safeguards
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            >
              Settings
            </Link>
            <Link
              to="/app"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </div>
        </div>

        <section className="panel-surface rounded-[28px] p-6">
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
            BALVIS is being tightened around real security patterns, not just a
            nicer UI. The goal is a study app that keeps routes clear, account
            state separated from the workspace, and LLM behavior constrained by
            backend controls.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STANDARDS.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="panel-strong rounded-[24px] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-[color:var(--text)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <div className="panel-strong rounded-[28px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  Current controls
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  The pieces already applied to the running app.
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
              {SECURITY_CONTROLS.map((control) => (
                <li key={control} className="flex gap-3">
                  <FiCheckCircle className="mt-1 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                  <span>{control}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-strong rounded-[28px] p-6">
            <p className="caption-label">Linked routes</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">
              Standard pages inside the app
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Core parts of BALVIS now have their own routes so users can move
              around the product more predictably.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                { to: "/auth", label: "/auth", detail: "Account access" },
                { to: "/app", label: "/app", detail: "Main study workspace" },
                {
                  to: "/app/summarize",
                  label: "/app/summarize",
                  detail: "Summary-focused entry point",
                },
                {
                  to: "/app/whiteboard",
                  label: "/app/whiteboard",
                  detail: "Whiteboard-focused entry point",
                },
                {
                  to: "/settings",
                  label: "/settings",
                  detail: "Account preferences and session controls",
                },
              ].map((route) => (
                <Link
                  key={route.to}
                  to={route.to}
                  className="rounded-[20px] border border-[color:var(--surface-border)] bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-black/10"
                >
                  <div className="text-sm font-semibold text-[color:var(--text)]">
                    {route.label}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--muted)]">
                    {route.detail}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SecurityPage;
