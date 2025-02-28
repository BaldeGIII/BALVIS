import React from "react";

const QUICK_ACTIONS = [
  "Schedule a meeting",
  "Find a video",
  "Summarize text",
  "Set a reminder",
];

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => onActionSelect(action)}
          className="px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-white/20 backdrop-blur-sm 
                   hover:bg-accent-primary hover:text-white
                   text-gray-800 dark:text-white border border-slate-200 dark:border-white/20
                   transition-all duration-200 text-sm"
        >
          {action}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;