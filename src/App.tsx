import { useState, useEffect, useRef } from "react";
import VoiceInput from "./components/VoiceInput";
import QuickActions from "./components/QuickActions";
import MessageBubble from "./components/MessageBubble";
import Header from "./components/Header";
import TextSummarizer from "./components/TextSummarizer";

function App() {
  const [showSummarizer, setShowSummarizer] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ type: "user" | "ai"; content: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("openai_api_key") || ""
  );
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, showSummarizer]);

  // Adjust textarea height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleKeySubmit = (key: string) => {
    localStorage.setItem("openai_api_key", key);
    setApiKey(key);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() || !apiKey) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { type: "user", content: message },
    ]);
    setMessage("");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
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
      const response = await fetch("http://localhost:5000/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Add AI response with summary
      setMessages((prev) => [...prev, { type: "ai", content: data.summary }]);
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 to-sky-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      <Header
        onKeySubmit={handleKeySubmit}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="flex flex-col py-6 px-4">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
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

        <div className="sticky bottom-0 p-6 bg-white/90 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto space-y-4">
            <QuickActions
              onActionSelect={(action) => {
                if (action === "Summarize text") {
                  setShowSummarizer(true);
                  // Scroll to where the summarizer will appear
                  setTimeout(() => scrollToBottom(), 100);
                } else {
                  setMessage(action);
                }
              }}
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
      </main>
    </div>
  );
}

export default App;
