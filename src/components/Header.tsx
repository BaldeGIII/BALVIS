import React from "react";
import { FiMoon, FiRefreshCw, FiSun } from "react-icons/fi";

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onClearConversation: () => void;
}

const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  onClearConversation,
}) => {
  return (
    <header className="relative z-30 px-4 pb-2 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[82rem] items-center justify-between gap-3 rounded-[22px] border soft-divider bg-[color:var(--surface)]/88 px-4 py-3 shadow-[0_10px_24px_rgba(63,43,25,0.07)] backdrop-blur-xl sm:px-5">
        <div className="min-w-0">
          <p className="caption-label">BALVIS</p>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
            A study workspace for questions, notes, videos, and whiteboards.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
