import React from "react";
import { Link } from "react-router-dom";
import { FiMoon, FiRefreshCw, FiSun } from "react-icons/fi";

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onClearConversation: () => void;
  authLoading: boolean;
  user: {
    name: string;
    email: string;
  } | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  onClearConversation,
  authLoading,
  user,
  onLogout,
}) => {
  return (
    <header className="relative z-30 px-4 pb-2 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[82rem] items-center justify-between gap-3 rounded-[22px] border soft-divider bg-[color:var(--surface)]/88 px-4 py-3 shadow-[0_10px_24px_rgba(63,43,25,0.07)] backdrop-blur-xl sm:px-5">
        <Link to="/app" className="min-w-0">
          <p className="caption-label">BALVIS</p>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
            A study workspace for questions, notes, videos, and whiteboards.
          </p>
        </Link>

        <div className="flex items-center gap-2">
          {authLoading ? (
            <div className="hidden rounded-full border border-[color:var(--surface-border)] bg-white/60 px-3 py-2 text-xs font-medium text-[color:var(--muted)] sm:inline-flex">
              Checking account
            </div>
          ) : user ? (
            <>
              <Link
                to="/settings"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-3.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              >
                Settings
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/60 px-3 py-1.5 text-sm text-[color:var(--text)] sm:inline-flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-xs font-semibold text-[color:var(--accent)]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[10rem] truncate font-medium">
                  {user.name}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-3.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
                title="Sign out"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-3.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              title="Sign in"
            >
              Sign in
            </Link>
          )}

          <button
            onClick={onClearConversation}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-3.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            title="Clear conversation"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-white/70 text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
