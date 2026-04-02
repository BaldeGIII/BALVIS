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
    <header className="relative z-30 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 rounded-[26px] border soft-divider bg-[color:var(--surface-strong)]/90 px-4 py-4 shadow-[0_14px_32px_rgba(63,43,25,0.08)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="max-w-3xl">
          <p className="caption-label">BALVIS</p>
          <h1 className="headline-display mt-1 text-[2rem] font-semibold leading-tight text-[color:var(--text)] sm:text-4xl">
            A calmer place to study
          </h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)] sm:hidden">
            Questions, notes, videos, and whiteboards in one workspace.
          </p>
          <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[color:var(--muted)] sm:block">
            Ask better questions, summarize dense material, and work through
            ideas without leaving the same workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onClearConversation}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
            title="Clear conversation"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-white/70 text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
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
