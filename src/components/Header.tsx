import React from "react";

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
    <header className="p-6 border-b border-glass-light dark:border-glass-dark backdrop-blur-lg relative z-30">
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
          BALVIS
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={onClearConversation}
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50
                     text-red-700 dark:text-red-200 transition-colors border border-red-200 dark:border-red-800"
            title="Clear Conversation"
          >
            🗑️
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                     text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-gray-600"
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
