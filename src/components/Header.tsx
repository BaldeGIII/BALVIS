import React, { useState, useRef, useEffect } from "react";
import APIKey from "./APIKey";

interface HeaderProps {
  onKeySubmit: (key: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onClearConversation: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onKeySubmit,
  darkMode,
  setDarkMode,
  onClearConversation,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);

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

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50
                       text-blue-700 dark:text-blue-200 transition-colors border border-blue-200 dark:border-blue-800"
            >
              ⚙️
            </button>

            {showSettings && (
              <div
                className="absolute right-0 mt-2 p-4 rounded-xl 
                           bg-white dark:bg-gray-800 shadow-xl 
                           border border-gray-200 dark:border-gray-700 z-50
                           min-w-[320px] max-w-sm"
              >
                <APIKey onKeySubmit={onKeySubmit} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
