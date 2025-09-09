import React, { useState } from "react";

interface Tab {
  id: string;
  title: string;
  messages: Array<{
    type: "user" | "ai";
    content: string;
    originalText?: string;
  }>;
}

interface ConversationTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabCreate: () => void;
  onTabDelete: (tabId: string) => void;
  onTabRename: (tabId: string, newTitle: string) => void;
}

const ConversationTabs: React.FC<ConversationTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabCreate,
  onTabDelete,
  onTabRename,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEdit = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleSaveEdit = () => {
    if (editingTabId && editingTitle.trim()) {
      onTabRename(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingTabId(null);
    setEditingTitle("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center min-w-0 max-w-xs group ${
                tab.id === activeTabId
                  ? "bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyPress}
                  className="px-3 py-2 bg-transparent border-none outline-none text-sm font-medium min-w-0 flex-1"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => onTabSelect(tab.id)}
                  onDoubleClick={() => handleStartEdit(tab)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
                           truncate min-w-0 flex-1 text-left"
                  title={tab.title}
                >
                  {tab.title}
                </button>
              )}

              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabDelete(tab.id);
                  }}
                  className="p-1 mr-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 
                           text-red-600 dark:text-red-400 rounded transition-opacity"
                  title="Delete conversation"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}

          <button
            onClick={onTabCreate}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-2"
            title="New conversation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationTabs;
