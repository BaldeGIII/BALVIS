import React, { useState } from "react";
import Whiteboard from "./Whiteboard";

// 🤖 JARVIS-Inspired Features for BALVIS
const JARVIS_FEATURES = {
  "Core Functions": ["Find Educational Videos", "Summarize Text"],
  "Voice Integration": [
    "Voice Commands",
    "Voice Responses",
    "Hands-free Study",
    "Voice Note-taking",
  ],
  "Smart Study Assistant": [
    "Study Schedule AI",
    "Progress Tracking",
    "Adaptive Learning",
    "Smart Reminders",
  ],
  "Multimodal Capabilities": [
    "Document Analysis",
    "Image Recognition",
    "Diagram Explanation",
    "Whiteboard Integration",
  ],
  "Advanced Research Tools": [
    "Real-time Web Search",
    "Paper Summarization",
    "Citation Management",
    "Fact Checking",
  ],
  "Personalized Learning": [
    "Learning Style Detection",
    "Knowledge Mapping",
    "Weakness Identification",
    "Custom Curricula",
  ],
  "Smart Notifications & Automation": [
    "Study Reminders",
    "Deadline Tracking",
    "Focus Mode",
    "Progress Reports",
  ],
} as const;

type CategoryKey = keyof typeof JARVIS_FEATURES;

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
  onCreateWhiteboardTab?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionSelect,
  onCreateWhiteboardTab,
}) => {
  const [activeCategory, setActiveCategory] =
    useState<CategoryKey>("Core Functions");
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle action selection with special cases for existing functionality
  const handleActionSelect = async (action: string) => {
    switch (action) {
      case "Find Educational Videos":
        onActionSelect("I want to find a video about");
        break;
      case "Summarize Text":
        onActionSelect("Summarize text");
        break;
      case "Whiteboard Integration":
        if (onCreateWhiteboardTab) {
          onCreateWhiteboardTab();
        } else {
          setShowWhiteboard(true);
        }
        break;
      default:
        // For now, just show what the feature would do
        onActionSelect(
          `🚧 Coming Soon: ${action} - This JARVIS-inspired feature will be implemented soon!`
        );
        break;
    }
  };

  // Handle whiteboard analysis
  const handleWhiteboardAnalysis = async (imageData: string) => {
    setIsAnalyzing(true);

    try {
      const apiKey = localStorage.getItem("openai_api_key");
      if (!apiKey) {
        alert("Please set your OpenAI API key first");
        return;
      }

      const response = await fetch(
        "http://localhost:3001/api/analyze-whiteboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageData,
            apiKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      // Close whiteboard and send analysis as message
      setShowWhiteboard(false);
      onActionSelect(
        `🎨 **Whiteboard Analysis Complete!**\n\n${result.analysis}`
      );
    } catch (error) {
      console.error("Whiteboard analysis error:", error);
      alert("Failed to analyze whiteboard. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCloseWhiteboard = () => {
    setShowWhiteboard(false);
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(JARVIS_FEATURES) as CategoryKey[]).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeCategory === category
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100/90 dark:bg-white/20 hover:bg-blue-100 dark:hover:bg-white/30 text-gray-700 dark:text-gray-300"
            }`}
          >
            {category === "Core Functions"
              ? "🎯"
              : category === "Voice Integration"
              ? "🎤"
              : category === "Smart Study Assistant"
              ? "📚"
              : category === "Multimodal Capabilities"
              ? "🔄"
              : category === "Advanced Research Tools"
              ? "🔍"
              : category === "Personalized Learning"
              ? "🧠"
              : "⚡"}{" "}
            {category}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {JARVIS_FEATURES[activeCategory].map((action: string) => (
          <button
            key={action}
            onClick={() => handleActionSelect(action)}
            className={`px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-200 text-sm ${
              activeCategory === "Core Functions" ||
              action === "Whiteboard Integration"
                ? "bg-green-100/90 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
                : "bg-slate-100/90 dark:bg-white/20 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-800 dark:text-white border border-slate-200 dark:border-white/20"
            }`}
          >
            {activeCategory === "Core Functions" ||
            action === "Whiteboard Integration"
              ? "✅"
              : "🚧"}{" "}
            {action}
          </button>
        ))}
      </div>

      {/* Feature Description */}
      {activeCategory !== "Core Functions" && (
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="font-medium">🤖 JARVIS Mode:</span> These advanced AI
          features are coming soon to make BALVIS your ultimate study companion!
          {activeCategory === "Multimodal Capabilities" && (
            <div className="mt-2">
              <span className="font-medium text-green-600">
                ✅ Whiteboard Integration is now available!
              </span>{" "}
              Draw diagrams, equations, or notes and let BALVIS analyze them.
            </div>
          )}
        </div>
      )}

      {/* Whiteboard Modal */}
      {showWhiteboard && (
        <Whiteboard
          onAnalyze={handleWhiteboardAnalysis}
          onClose={handleCloseWhiteboard}
          isAnalyzing={isAnalyzing}
          isModal={true}
        />
      )}
    </div>
  );
};

export default QuickActions;
