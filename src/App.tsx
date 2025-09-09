import { useState, useEffect, useRef } from "react";
import VoiceInput from "./components/VoiceInput";
import QuickActions from "./components/QuickActions";
import MessageBubble from "./components/MessageBubble";
import Header from "./components/Header";
import TextSummarizer from "./components/TextSummarizer";
import ConversationTabs from "./components/ConversationTabs";
import Whiteboard from "./components/Whiteboard";

interface Tab {
  id: string;
  title: string;
  type?: "chat" | "whiteboard";
  messages: Array<{
    type: "user" | "ai";
    content: string;
    originalText?: string;
  }>;
}

function App() {
  const [showSummarizer, setShowSummarizer] = useState(false);
  const [message, setMessage] = useState("");

  // Initialize tabs with saved conversations or create a default tab
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const savedTabs = localStorage.getItem("balvis_tabs");
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        return parsedTabs.length > 0
          ? parsedTabs
          : [{ id: "1", title: "New Chat", messages: [] }];
      }
      return [{ id: "1", title: "New Chat", messages: [] }];
    } catch (error) {
      console.error("Error loading saved tabs:", error);
      return [{ id: "1", title: "New Chat", messages: [] }];
    }
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveTab = localStorage.getItem("balvis_active_tab");
    return savedActiveTab || "1";
  });

  const [loading, setLoading] = useState(false);
  const [whiteboardAnalyzing, setWhiteboardAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("openai_api_key") || ""
  );
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current active tab
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const messages = activeTab.messages;

  // Helper function to update messages in the active tab
  const setMessages = (updater: (prev: Tab["messages"]) => Tab["messages"]) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, messages: updater(tab.messages) }
          : tab
      )
    );
  };

  // Tab management functions
  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId);
    localStorage.setItem("balvis_active_tab", tabId);
  };

  const handleTabCreate = () => {
    const newTabId = Date.now().toString();
    const newTab: Tab = {
      id: newTabId,
      title: "New Chat",
      type: "chat",
      messages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    localStorage.setItem("balvis_active_tab", newTabId);
  };

  const handleWhiteboardTabCreate = () => {
    const newTabId = `whiteboard-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      title: "🎨 Whiteboard",
      type: "whiteboard",
      messages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    localStorage.setItem("balvis_active_tab", newTabId);
  };

  const handleWhiteboardAnalyze = async (imageData: string) => {
    if (!apiKey) {
      alert("Please set your OpenAI API key first");
      return;
    }

    setWhiteboardAnalyzing(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/analyze-whiteboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageData, apiKey }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze whiteboard");
      }

      const data = await response.json();

      // Create a new analysis tab next to the whiteboard
      const newTabId = `analysis_${Date.now()}`;
      const analysisMessage = {
        type: "ai" as const,
        content: data.analysis,
      };

      const newAnalysisTab = {
        id: newTabId,
        title: "Whiteboard Analysis",
        type: "chat" as const,
        messages: [analysisMessage],
      };

      // Insert the new tab right after the current whiteboard tab
      const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
      const newTabs = [...tabs];
      newTabs.splice(currentTabIndex + 1, 0, newAnalysisTab);
      setTabs(newTabs);

      // Switch to the new analysis tab
      setActiveTabId(newTabId);
      localStorage.setItem("balvis_active_tab", newTabId);
    } catch (error) {
      console.error("Whiteboard analysis error:", error);
      alert("Failed to analyze whiteboard. Please try again.");
    } finally {
      setWhiteboardAnalyzing(false);
    }
  };

  const handleTabDelete = (tabId: string) => {
    if (tabs.length <= 1) return; // Don't delete the last tab

    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);

    // If deleting active tab, switch to the first remaining tab
    if (tabId === activeTabId) {
      const newActiveTabId = updatedTabs[0].id;
      setActiveTabId(newActiveTabId);
      localStorage.setItem("balvis_active_tab", newActiveTabId);
    }
  };

  const handleTabRename = (tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, title: newTitle } : tab))
    );
  };

  // Auto-update tab title based on first user message
  const updateTabTitle = (message: string) => {
    if (activeTab.messages.length === 0 && activeTab.title === "New Chat") {
      const title =
        message.length > 30 ? message.substring(0, 30) + "..." : message;
      handleTabRename(activeTabId, title);
    }
  };

  // Function to adjust textarea height based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Save tabs to localStorage whenever tabs change
  useEffect(() => {
    try {
      localStorage.setItem("balvis_tabs", JSON.stringify(tabs));
    } catch (error) {
      console.error("Error saving tabs:", error);
    }
  }, [tabs]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showSummarizer]);

  // Adjust textarea height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  useEffect(() => {
    // Handle web search results from QuickActions
    const handleWebSearchResult = (event: CustomEvent) => {
      if (event.detail && event.detail.content) {
        setMessages((prev) => [
          ...prev,
          { type: "ai", content: event.detail.content },
        ]);
      }
    };

    // Handle video search results from QuickActions (YouTube API)
    const handleVideoSearchResult = (event: CustomEvent) => {
      if (event.detail && event.detail.content) {
        setMessages((prev) => [
          ...prev,
          { type: "ai", content: event.detail.content },
        ]);
      }
    };

    window.addEventListener(
      "webSearchResult",
      handleWebSearchResult as EventListener
    );

    window.addEventListener(
      "videoSearchResult",
      handleVideoSearchResult as EventListener
    );

    return () => {
      window.removeEventListener(
        "webSearchResult",
        handleWebSearchResult as EventListener
      );
      window.removeEventListener(
        "videoSearchResult",
        handleVideoSearchResult as EventListener
      );
    };
  }, []);

  const handleKeySubmit = (key: string) => {
    localStorage.setItem("openai_api_key", key);
    setApiKey(key);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() || !apiKey) return;

    // Update tab title if this is the first message
    updateTabTitle(message);

    setMessages((prevMessages) => [
      ...prevMessages,
      { type: "user", content: message },
    ]);
    setMessage("");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [...prev, { type: "ai", content: data.reply }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // New function to handle summarization
  const handleSummarize = async (text: string, source: string) => {
    setLoading(true);

    // Add user message showing what's being summarized
    const userMessage =
      source === "pdf"
        ? "📄 Summarize this PDF document for me"
        : "📝 Summarize this text for me";

    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);

    try {
      const response = await fetch("http://localhost:3001/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Add AI response with summary and store original text
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.summary,
          originalText: text, // Store the original text that was summarized
        },
      ]);
    } catch (error) {
      console.error("Error summarizing text:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "Sorry, I encountered an error while summarizing the content.",
        },
      ]);
    } finally {
      setLoading(false);
      setShowSummarizer(false);
    }
  };

  // Function to handle video search requests from MessageBubble
  const handleVideoSearchFromMessage = async (query: string) => {
    if (!apiKey || loading) return;

    // Add the query as a user message
    setMessages((prev) => [...prev, { type: "user", content: query }]);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ message: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { type: "ai", content: data.reply }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "Sorry, there was an error processing your video search request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear conversation (now handled by tab deletion)
  const handleClearConversation = () => {
    if (tabs.length <= 1) {
      // If only one tab, clear its messages
      setMessages(() => []);
    } else {
      // If multiple tabs, delete current tab
      handleTabDelete(activeTabId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 to-sky-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      <Header
        onKeySubmit={handleKeySubmit}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onClearConversation={handleClearConversation}
      />

      <ConversationTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabCreate={handleTabCreate}
        onTabDelete={handleTabDelete}
        onTabRename={handleTabRename}
      />

      <main className="flex-1 flex flex-col w-full overflow-hidden">
        {activeTab.type === "whiteboard" ? (
          // Whiteboard in full-screen mode
          <div className="flex-1 w-full h-full">
            <Whiteboard
              onClose={() => handleTabDelete(activeTab.id)}
              onAnalyze={handleWhiteboardAnalyze}
              isAnalyzing={whiteboardAnalyzing}
              isModal={false}
            />
          </div>
        ) : (
          // Chat view with messages
          <div
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            tabIndex={0}
            onKeyDown={(e) => {
              // Handle Ctrl+A to select only text in current conversation
              if (e.ctrlKey && e.key === "a") {
                e.preventDefault();
                e.stopPropagation();

                // Create a range that includes all text content in this conversation container
                const selection = window.getSelection();
                const range = document.createRange();
                const conversationContainer = e.currentTarget.querySelector(
                  ".conversation-content"
                );

                if (selection && conversationContainer) {
                  selection.removeAllRanges();
                  range.selectNodeContents(conversationContainer);
                  selection.addRange(range);
                }
              }
            }}
          >
            <div className="conversation-content flex flex-col py-6 px-6 max-w-5xl mx-auto w-full">
              {/* Use max-w-5xl for better readability */}
              {messages.map((msg, index) => (
                <MessageBubble
                  key={index}
                  message={msg}
                  onVideoSearch={handleVideoSearchFromMessage}
                />
              ))}
              {loading && (
                <div className="flex space-x-2 p-4 max-w-xs mx-auto">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-100" />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-200" />
                </div>
              )}

              {/* TextSummarizer appears inside the scrollable area */}
              {showSummarizer && !loading && (
                <div className="w-full max-w-3xl mx-auto my-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                    <TextSummarizer
                      apiKey={apiKey}
                      onClose={() => setShowSummarizer(false)}
                      onSummaryResult={(text, source) =>
                        handleSummarize(text, source)
                      }
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {activeTab.type !== "whiteboard" && (
          <div className="sticky bottom-0 p-6 bg-white/90 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 backdrop-blur-lg">
            <div className="max-w-5xl mx-auto w-full space-y-4">
              <QuickActions
                onActionSelect={(action) => {
                  if (action === "Summarize text") {
                    setShowSummarizer(true);
                    // Scroll to where the summarizer will appear
                    setTimeout(() => scrollToBottom(), 100);
                  } else if (action === "Whiteboard Integration") {
                    handleWhiteboardTabCreate();
                  } else {
                    setMessage(action);
                  }
                }}
                onCreateWhiteboardTab={handleWhiteboardTabCreate}
              />

              <form onSubmit={handleSubmit} className="flex items-center gap-4">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      // Regular Enter - submit the form
                      e.preventDefault();
                      if (message.trim() && apiKey && !loading) {
                        handleSubmit(e as any);
                      }
                    }
                    // Shift+Enter will naturally create a new line
                  }}
                  placeholder="Type your message..."
                  className="flex-1 p-4 rounded-xl bg-white dark:bg-gray-700 
                  border border-gray-200 dark:border-gray-600
                  text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                  shadow-sm resize-none"
                  style={{
                    minHeight: "56px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                  rows={1}
                  disabled={!apiKey || loading}
                />
                <VoiceInput
                  isListening={isListening}
                  setIsListening={setIsListening}
                  onSpeechResult={setMessage}
                  disabled={!apiKey || loading}
                />
                <button
                  type="submit"
                  disabled={loading || !apiKey || !message.trim()}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                         rounded-xl shadow-md transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white flex items-center gap-2"
                >
                  {loading ? "Sending..." : "Send"}
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
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
