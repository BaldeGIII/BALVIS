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
      <div className="mx-auto w-full max-w-[96rem]">
        <div className="flex items-center gap-2 overflow-x-auto rounded-[22px] border soft-divider bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 py-2 shadow-[0_8px_18px_color-mix(in_srgb,var(--accent)_8%,transparent)] backdrop-blur-lg scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex min-w-0 max-w-xs items-center rounded-full border transition ${
                tab.id === activeTabId
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                  : "border-transparent bg-[color:var(--accent-soft)] text-[color:var(--muted)] hover:border-[color:var(--surface-border)] hover:bg-[color:var(--accent-soft)]"
              }`}
            >
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyPress}
                  className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm font-medium outline-none"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => onTabSelect(tab.id)}
                  onDoubleClick={() => handleStartEdit(tab)}
                  className="min-w-0 flex-1 truncate px-4 py-2 text-left text-sm font-semibold"
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
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted)] opacity-60 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 hover:text-[color:var(--text)] dark:hover:bg-[color:var(--accent-soft)]"
                title="Delete conversation"
                aria-label={`Delete conversation: ${tab.title}`}
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={onTabCreate}
            className="ml-1 inline-flex h-9 min-w-[36px] items-center justify-center rounded-full border border-dashed border-[color:var(--surface-border)] bg-[color:var(--accent-soft)] px-3 text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--text)]"
            title="New conversation"
            aria-label="New conversation"
          >
            <FiPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationTabs;
