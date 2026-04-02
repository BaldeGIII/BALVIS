import React, { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";

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
    <div className="px-4 pb-1 sm:px-6">
      <div className="mx-auto w-full max-w-[88rem]">
        <div className="flex items-center gap-2 overflow-x-auto rounded-[24px] border soft-divider bg-[color:var(--surface)] px-3 py-2.5 shadow-[0_10px_22px_rgba(63,43,25,0.06)] backdrop-blur-lg scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex min-w-0 max-w-xs items-center rounded-full border transition ${
                tab.id === activeTabId
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                  : "border-transparent bg-white/50 text-[color:var(--muted)] hover:border-[color:var(--surface-border)] hover:bg-white/80 dark:bg-black/10"
              }`}
            >
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyPress}
                  className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm font-medium outline-none"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => onTabSelect(tab.id)}
                  onDoubleClick={() => handleStartEdit(tab)}
                  className="min-w-0 flex-1 truncate px-4 py-2.5 text-left text-sm font-semibold"
                  title={tab.title}
                >
                  {tab.title}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabDelete(tab.id);
                }}
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted)] opacity-0 transition group-hover:opacity-100 hover:bg-black/5 hover:text-[color:var(--text)] dark:hover:bg-white/10"
                title="Delete conversation"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={onTabCreate}
            className="ml-1 inline-flex h-10 min-w-[40px] items-center justify-center rounded-full border border-dashed border-[color:var(--surface-border)] bg-white/60 px-3 text-[color:var(--muted)] transition hover:bg-white hover:text-[color:var(--text)] dark:bg-black/10"
            title="New conversation"
          >
            <FiPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationTabs;
