import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit3,
  FiFileText,
  FiLogOut,
  FiMic,
  FiMoon,
  FiSun,
  FiUser,
} from "react-icons/fi";
import {
  fetchAuthStatus,
  logoutAccount,
  updateProfile,
  type AuthUser,
} from "../lib/auth";
import { getStoredDarkMode, persistDarkMode } from "../lib/theme";

type MicPermissionState = "loading" | "granted" | "prompt" | "denied" | "unsupported";

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [darkMode, setDarkMode] = useState(() => getStoredDarkMode());
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("loading");

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
          setDisplayName(payload.user.name);
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

  useEffect(() => {
    persistDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    let active = true;

    const loadMicPermission = async () => {
      if (typeof navigator === "undefined") {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || !navigator.permissions?.query) {
        if (active) {
          setMicPermission("unsupported");
        }
        return;
      }

      try {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        if (!active) {
          return;
        }

        const updateState = () => {
          if (!active) {
            return;
          }

          setMicPermission(
            status.state === "granted" ||
              status.state === "prompt" ||
              status.state === "denied"
              ? status.state
              : "unsupported"
          );
        };

        updateState();
        status.onchange = updateState;
      } catch (error) {
        console.error("Unable to read microphone permissions:", error);
        if (active) {
          setMicPermission("unsupported");
        }
      }
    };

    loadMicPermission();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } catch (error) {
      console.error("Unable to sign out:", error);
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const payload = await updateProfile({ name: displayName });
      setUser(payload.user);
      setDisplayName(payload.user.name);
      setProfileMessage(payload.message || "Profile updated.");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now."
      );
    } finally {
      setSavingProfile(false);
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

  const micStatusLabel = {
    granted: "Ready",
    prompt: "Needs permission",
    denied: "Blocked",
    unsupported: "Not supported here",
    loading: "Checking",
  }[micPermission];

  const micStatusCopy = {
    granted:
      "Voice input should be ready in the composer. If it still fails, refresh once and try the mic button again.",
    prompt:
      "Your browser will ask for microphone access the next time you start voice input.",
    denied:
      "Microphone access is blocked in this browser. Re-enable it in site settings to use voice input.",
    unsupported:
      "This browser does not expose microphone permissions cleanly. Chrome or Edge will work best for voice input.",
    loading: "Checking microphone availability now.",
  }[micPermission];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[color:var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="caption-label">Settings</p>
            <h1 className="headline-display mt-2 text-4xl font-semibold">
              Profile and preferences
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Keep your workspace comfortable, keep your profile current, and
              quickly jump back into the tools you use most.
            </p>
          </div>

          <Link
            to="/app"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel-surface rounded-[28px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  Profile
                </p>
                <p className="text-sm text-[color:var(--muted)]">
                  Manage the name that appears around your BALVIS workspace.
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Display name
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-[18px] border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-3 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  placeholder="Your name"
                  required
                />
              </label>

              <div className="rounded-[18px] border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Email
                </p>
                <p className="mt-2 text-sm text-[color:var(--text)]">
                  {user?.email}
                </p>
              </div>

              {user?.createdAt && (
                <div className="rounded-[18px] border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Account created
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--text)]">
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
              )}

              {(profileError || profileMessage) && (
                <div
                  className={`rounded-[18px] px-4 py-3 text-sm ${
                    profileError
                      ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-100"
                  }`}
                >
                  {profileError || profileMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiUser className="h-4 w-4" />
                {savingProfile ? "Saving profile" : "Save profile"}
              </button>
            </form>
          </section>

          <div className="space-y-4">
            <section className="panel-strong rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  {darkMode ? (
                    <FiMoon className="h-5 w-5" />
                  ) : (
                    <FiSun className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--text)]">
                    Appearance
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    Choose the look that feels easiest on your eyes.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    darkMode
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60"
                      : "border-[color:var(--surface-border)] bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <FiMoon className="h-4 w-4" />
                    Comfort charcoal
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    A softer charcoal palette with lower contrast for longer study sessions.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    !darkMode
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]/60"
                      : "border-[color:var(--surface-border)] bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <FiSun className="h-4 w-4" />
                    Paper light
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    A lighter reading surface with soft edges and reduced glare.
                  </p>
                </button>
              </div>
            </section>

            <section className="panel-strong rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <FiMic className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--text)]">
                    Voice input
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    Check microphone access before you use the composer mic.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[20px] border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Microphone status
                  </p>
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                    {micStatusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  {micStatusCopy}
                </p>
              </div>
            </section>

            <section className="panel-strong rounded-[28px] p-6">
              <p className="text-lg font-semibold text-[color:var(--text)]">
                Shortcuts
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  to="/app/summarize"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
                >
                  <FiFileText className="h-4 w-4" />
                  Open summarizer
                </Link>
                <Link
                  to="/app/whiteboard"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
                >
                  <FiEdit3 className="h-4 w-4" />
                  Open whiteboard
                </Link>
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
                >
                  <FiUser className="h-4 w-4" />
                  Reset password
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface)]"
                >
                  <FiLogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
