import React from "react";

const QUICK_ACTIONS = [
  "Schedule a meeting",
  "Find a video",
  "Summarize text",
  "Set a reminder",
];

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
  apiKey: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionSelect,
  apiKey,
}) => {
  // Fixed function to handle video search action
  const handleVideoSearchAction = async (action: string) => {
    // If it's not the video action, just pass it through
    if (action !== "Find a video") {
      onActionSelect(action);
      return;
    }

    // For video search, we want to log it first
    try {
      // Show a prompt to get the search query
      const searchQuery = window.prompt(
        "What kind of video would you like to find?"
      );

      if (!searchQuery || searchQuery.trim() === "") {
        return; // User cancelled or entered empty query
      }

      // Log the search query to our backend
      const response = await fetch(
        "http://localhost:5000/api/log-video-search",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ query: searchQuery }),
        }
      );

      if (!response.ok) {
        console.error("Failed to log video search");
      } else {
        console.log("Video search logged successfully");
      }

      // Now construct the full action text and pass it to the handler
      const fullAction = `Find a video about ${searchQuery}`;
      onActionSelect(fullAction);
    } catch (error) {
      console.error("Error handling video search action:", error);
      // Still try to perform the basic action even if logging fails
      onActionSelect(action);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => handleVideoSearchAction(action)}
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
