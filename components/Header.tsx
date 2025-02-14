import React, { useState } from "react";
import APIKey from "./APIKey";

interface HeaderProps {
  onKeySubmit: (key: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  onKeySubmit,
  darkMode,
  setDarkMode,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="p-6 border-b border-glass-light dark:border-glass-dark backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
          BALVIS
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                     text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-gray-600"
          >
            {darkMode ? "🌞" : "🌙"}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50
                       text-blue-700 dark:text-blue-200 transition-colors border border-blue-200 dark:border-blue-800"
            >
              ⚙️
            </button>

            {showSettings && (
              <div
                className="absolute right-0 mt-2 w-72 p-4 rounded-xl 
                           bg-white dark:bg-gray-800 shadow-xl 
                           border border-gray-200 dark:border-gray-700 z-50"
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
