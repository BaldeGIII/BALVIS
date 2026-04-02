import React, { useState } from "react";
import {
  FiArrowRight,
  FiEdit3,
  FiFileText,
  FiSearch,
} from "react-icons/fi";
import Whiteboard from "./Whiteboard";
import { apiUrl, createApiHeaders } from "../lib/api";

const ACTIONS = [
  {
    label: "Find a video",
    detail: "Search for a few useful explanations on YouTube.",
    command: "I want to find a video about",
    icon: FiSearch,
  },
  {
    label: "Summarize notes",
    detail: "Condense a chapter, lecture, or prompt into the essentials.",
    command: "Summarize text",
    icon: FiFileText,
  },
  {
    label: "Open whiteboard",
    detail: "Sketch a diagram or equation, then analyze it.",
    command: "Whiteboard Integration",
    icon: FiEdit3,
  },
] as const;

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
  onCreateWhiteboardTab?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionSelect,
  onCreateWhiteboardTab,
}) => {
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleActionSelect = (command: string) => {
    if (command === "Whiteboard Integration") {
      if (onCreateWhiteboardTab) {
        onCreateWhiteboardTab();
      } else {
        setShowWhiteboard(true);
      }
      return;
    }

    onActionSelect(command);
  };

  const handleWhiteboardAnalysis = async (imageData: string) => {
    setIsAnalyzing(true);

    try {
      const apiKey = localStorage.getItem("openai_api_key");
      const response = await fetch(apiUrl("/api/analyze-whiteboard"), {
        method: "POST",
        headers: createApiHeaders(apiKey ?? "", {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          imageData,
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      setShowWhiteboard(false);
      onActionSelect(`Whiteboard notes\n\n${result.analysis}`);
    } catch (error) {
      console.error("Whiteboard analysis error:", error);
      alert("Failed to analyze the whiteboard. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700 sm:flex-wrap sm:overflow-visible">
        {ACTIONS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleActionSelect(item.command)}
              className="group flex min-h-[52px] min-w-[200px] flex-none items-center gap-3 rounded-[18px] border border-[color:var(--surface-border)] bg-white/70 px-3.5 py-3 text-left transition hover:border-[color:var(--accent)] hover:bg-white dark:bg-black/10 sm:min-w-0 sm:flex-1"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[color:var(--text)]">
                  {item.label}
                </h3>
                <p className="mt-0.5 hidden text-xs leading-5 text-[color:var(--muted)] lg:block">
                  {item.detail}
                </p>
              </div>
              <FiArrowRight className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--accent)]" />
            </button>
          );
        })}
      </div>

      {showWhiteboard && (
        <Whiteboard
          onAnalyze={handleWhiteboardAnalysis}
          onClose={() => setShowWhiteboard(false)}
          isAnalyzing={isAnalyzing}
          isModal={true}
        />
      )}
    </div>
  );
};

export default QuickActions;
