import { useCallback, useEffect, useRef, useState } from "react";
import VoiceInput from "./components/VoiceInput";
import QuickActions from "./components/QuickActions";
import MessageBubble from "./components/MessageBubble";
import Header from "./components/Header";
import TextSummarizer from "./components/TextSummarizer";
import ConversationTabs from "./components/ConversationTabs";
import Whiteboard from "./components/Whiteboard";
import ResearchPanel, { type PanelTab } from "./components/ResearchPanel";
import { runAgent } from "./lib/agent";
import { docContext, type Doc, type Paper } from "./lib/research";
import { cancelSpeech, speak as speakAloud } from "./lib/speech";
import { apiUrl, createApiHeaders } from "./lib/api";
import {
  createSessionHeaders,
  fetchAuthStatus,
  logoutAccount,
  type AuthUser,
} from "./lib/auth";
import { getStoredDarkMode, persistDarkMode } from "./lib/theme";
import {
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
  FiEdit3,
  FiFileText,
  FiMessageSquare,
  FiSearch,
  FiSidebar,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

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

const createDefaultTabs = (): Tab[] => [
  { id: "1", title: "New session", type: "chat", messages: [] },
];

const hasMeaningfulConversationData = (candidateTabs: Tab[]) =>
  candidateTabs.length > 1 ||
  candidateTabs.some(
    (tab) => tab.type === "whiteboard" || (tab.messages?.length ?? 0) > 0
  );

function App() {
  const [showSummarizer, setShowSummarizer] = useState(false);
  const [message, setMessage] = useState("");

  // Initialize tabs with saved conversations or create a default tab
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const savedTabs = localStorage.getItem("balvis_tabs");
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        return parsedTabs.length > 0 ? parsedTabs : createDefaultTabs();
      }
      return createDefaultTabs();
    } catch (error) {
      console.error("Error loading saved tabs:", error);
      return createDefaultTabs();
    }
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveTab = localStorage.getItem("balvis_active_tab");
    return savedActiveTab || "1";
  });

  const [loading, setLoading] = useState(false);
  const [whiteboardAnalyzing, setWhiteboardAnalyzing] = useState(false);
  const [apiKey] = useState(() => localStorage.getItem("openai_api_key") || "");
  const [darkMode, setDarkMode] = useState(() => getStoredDarkMode());
  const [isListening, setIsListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);
  const [panelTab, setPanelTab] = useState<PanelTab>("papers");
  const [agentStatus, setAgentStatus] = useState("");
  const [injectedPapers, setInjectedPapers] = useState<{ papers: Paper[]; status: Record<string, string>; n: number } | null>(null);
  const [filesVersion, setFilesVersion] = useState(0);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [socratic, setSocratic] = useState(false);
  const handleDocChange = useCallback((d: Doc | null) => setActiveDoc(d), []);
  const [voiceReplies, setVoiceReplies] = useState(
    () => localStorage.getItem("balvis_voice_replies") !== "false"
  );
  const [showToolTray, setShowToolTray] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [remoteConversationsReady, setRemoteConversationsReady] =
    useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tabsRef = useRef<Tab[]>(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current active tab
  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) || tabs[0] || createDefaultTabs()[0];
  const messages = activeTab.messages;
  const showEmptyState =
    activeTab.type !== "whiteboard" &&
    messages.length === 0 &&
    !showSummarizer &&
    !loading;

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

  const persistActiveTabId = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    localStorage.setItem("balvis_active_tab", tabId);
  }, []);

  const openOrCreateChatTab = useCallback(() => {
    const existingChatTab = tabsRef.current.find(
      (tab) => tab.type !== "whiteboard"
    );

    if (existingChatTab) {
      persistActiveTabId(existingChatTab.id);
      return existingChatTab.id;
    }

    const newTabId = Date.now().toString();
    const newTab: Tab = {
      id: newTabId,
      title: "New session",
      type: "chat",
      messages: [],
    };

    setTabs((prev) => [...prev, newTab]);
    persistActiveTabId(newTabId);
    return newTabId;
  }, [persistActiveTabId]);

  const openOrCreateWhiteboardTab = useCallback(() => {
    const existingWhiteboardTab = tabsRef.current.find(
      (tab) => tab.type === "whiteboard"
    );

    if (existingWhiteboardTab) {
      persistActiveTabId(existingWhiteboardTab.id);
      return existingWhiteboardTab.id;
    }

    const newTabId = `whiteboard-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      title: "Whiteboard",
      type: "whiteboard",
      messages: [],
    };

    setTabs((prev) => [...prev, newTab]);
    persistActiveTabId(newTabId);
    return newTabId;
  }, [persistActiveTabId]);

  const saveRemoteConversations = useCallback(
    async (nextTabs: Tab[], nextActiveTabId: string) => {
      const headers = await createSessionHeaders({
        "Content-Type": "application/json",
      });
      const response = await fetch(apiUrl("/api/conversations"), {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          tabs: nextTabs,
          activeTabId: nextActiveTabId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to save conversations.");
      }
    },
    []
  );

  const loadAuthStatus = useCallback(async () => {
    try {
      const payload = await fetchAuthStatus();
      setAuthUser(payload.authenticated ? payload.user : null);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Tab management functions
  const handleTabSelect = (tabId: string) => {
    const selectedTab = tabs.find((tab) => tab.id === tabId);
    persistActiveTabId(tabId);

    if (selectedTab?.type === "whiteboard") {
      navigate("/app/whiteboard");
      return;
    }

    navigate("/app");
  };

  const handleTabCreate = () => {
    const newTabId = Date.now().toString();
    const newTab: Tab = {
      id: newTabId,
      title: "New session",
      type: "chat",
      messages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    persistActiveTabId(newTabId);
    navigate("/app");
  };

  const handleWhiteboardTabCreate = () => {
    openOrCreateWhiteboardTab();
    navigate("/app/whiteboard");
  };

  const handleWhiteboardAnalyze = async (imageData: string) => {
    setWhiteboardAnalyzing(true);
    try {
      const response = await fetch(apiUrl("/api/analyze-whiteboard"), {
        method: "POST",
        headers: createApiHeaders(apiKey, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ imageData, apiKey: apiKey || undefined }),
      });

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
      persistActiveTabId(newTabId);
      navigate("/app");
    } catch (error) {
      console.error("Whiteboard analysis error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to analyze whiteboard. Please try again.";
      alert(message);
    } finally {
      setWhiteboardAnalyzing(false);
    }
  };

  const handleTabDelete = (tabId: string) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);

    // If this was the last tab, create a new default chat tab
    if (updatedTabs.length === 0) {
      const newTabId = Date.now().toString();
      const newTab: Tab = {
        id: newTabId,
        title: "New session",
        type: "chat",
        messages: [],
      };
      setTabs([newTab]);
      persistActiveTabId(newTabId);
      navigate("/app");
      return;
    }

    setTabs(updatedTabs);

    // If deleting active tab, switch to the first remaining tab
    if (tabId === activeTabId) {
      const nextActiveTab = updatedTabs[0];
      persistActiveTabId(nextActiveTab.id);
      navigate(nextActiveTab.type === "whiteboard" ? "/app/whiteboard" : "/app");
    }
  };

  const handleTabRename = (tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, title: newTitle } : tab))
    );
  };

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthUser(null);
      setRemoteConversationsReady(false);
      navigate("/auth", { replace: true });
    }
  };

  // Auto-update tab title based on first user message
  const updateTabTitle = (message: string) => {
    if (activeTab.messages.length === 0 && activeTab.title === "New session") {
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
    persistDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, authUser, navigate]);

  useEffect(() => {
    if (location.pathname === "/app/whiteboard") {
      setShowToolTray(false);
      setShowSummarizer(false);
      openOrCreateWhiteboardTab();
      return;
    }

    if (location.pathname === "/app/summarize") {
      const currentTab = tabsRef.current.find(
        (tab) => tab.id === activeTabIdRef.current
      );

      if (!currentTab || currentTab.type === "whiteboard") {
        openOrCreateChatTab();
      }

      setShowToolTray(false);
      setShowSummarizer(true);
      return;
    }

    setShowSummarizer(false);
    // remoteConversationsReady: hydration replaces tabs, so re-apply the route afterwards
  }, [
    location.pathname,
    openOrCreateChatTab,
    openOrCreateWhiteboardTab,
    remoteConversationsReady,
  ]);

  // Save tabs to localStorage whenever tabs change
  useEffect(() => {
    try {
      localStorage.setItem("balvis_tabs", JSON.stringify(tabs));
    } catch (error) {
      console.error("Error saving tabs:", error);
    }
  }, [tabs]);

  useEffect(() => {
    if (messages.length > 0 || showSummarizer) scrollToBottom();
  }, [messages, showSummarizer]);

  useEffect(() => {
    setShowToolTray(false);
  }, [activeTabId, showSummarizer]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!authUser) {
      setRemoteConversationsReady(false);
      return;
    }

    let cancelled = false;

    const hydrateRemoteConversations = async () => {
      try {
        const response = await fetch(apiUrl("/api/conversations"), {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load saved conversations.");
        }

        if (cancelled) {
          return;
        }

        const remoteTabs: Tab[] = Array.isArray(payload.tabs) ? payload.tabs : [];
        const remoteHasContent = hasMeaningfulConversationData(remoteTabs);
        const localTabs = tabsRef.current;
        const localHasContent = hasMeaningfulConversationData(localTabs);

        if (remoteHasContent) {
          setTabs(remoteTabs);

          const nextActiveTabId = remoteTabs.some(
            (tab) => tab.id === payload.activeTabId
          )
            ? payload.activeTabId
            : remoteTabs[0]?.id || "1";

          setActiveTabId(nextActiveTabId);
          localStorage.setItem("balvis_active_tab", nextActiveTabId);
        } else if (localHasContent) {
          await saveRemoteConversations(
            localTabs,
            activeTabIdRef.current || localTabs[0]?.id || "1"
          );
        }

        if (!cancelled) {
          setRemoteConversationsReady(true);
        }
      } catch (error) {
        console.error("Error loading remote conversations:", error);
      }
    };

    hydrateRemoteConversations();

    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser, saveRemoteConversations]);

  useEffect(() => {
    if (authLoading || !authUser || !remoteConversationsReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveRemoteConversations(tabs, activeTabId).catch((error) => {
        console.error("Error saving remote conversations:", error);
      });
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeTabId,
    authLoading,
    authUser,
    remoteConversationsReady,
    saveRemoteConversations,
    tabs,
  ]);

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

  const speak = useCallback(
    (text: string) =>
      speakAloud(text, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      }),
    []
  );

  const toggleVoiceReplies = () => {
    const next = !voiceReplies;
    setVoiceReplies(next);
    localStorage.setItem("balvis_voice_replies", String(next));
    if (!next) {
      cancelSpeech();
      setSpeaking(false);
    }
  };

  // "Show the slides" opens the slide viewer instead of going to the model.
  const runLocalCommand = (text: string): string | null => {
    if (/\b(show|open|preview|pull up)\b.*\b(slides?|deck|presentation)\b/i.test(text)) {
      setPanelOpen(true);
      setPanelTab("slides");
      return activeDoc?.analysis
        ? "Opening your slide deck."
        : "Opening the slide viewer. Upload a PDF in the Document tab and I will build the deck.";
    }

    return null;
  };

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setShowToolTray(false);
    cancelSpeech();

    // Update tab title if this is the first message
    updateTabTitle(message);

    setMessages((prevMessages) => [
      ...prevMessages,
      { type: "user", content: message },
    ]);
    setMessage("");

    const local = runLocalCommand(message);
    if (local) {
      setMessages((prev) => [...prev, { type: "ai", content: local }]);
      if (voiceReplies) speak(local);
      return;
    }

    setLoading(true);
    try {
      const reply = await runAgent(
        {
          message,
          history: messages
            .slice(-10)
            .map((m) => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content })),
          mode: socratic ? "socratic" : undefined,
          context: activeDoc ? docContext(activeDoc) : undefined,
        },
        (event) => {
          if (event.type === "tool") setAgentStatus(event.label);
          if (event.type === "papers") {
            setInjectedPapers({ papers: event.papers, status: event.status, n: Date.now() });
            setPanelOpen(true);
            setPanelTab("papers");
          }
          if (event.type === "file") {
            setFilesVersion((v) => v + 1);
            setPanelOpen(true);
            setPanelTab("files");
          }
        }
      );

      setMessages((prev) => [...prev, { type: "ai", content: reply }]);
      if (voiceReplies) speak(reply);
    } catch (error) {
      console.error("Error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your request.";
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
      setAgentStatus("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(message);
  };

  // VoiceInput re-creates its recognizer when this callback changes, so keep it stable.
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;
  const handleVoiceResult = useCallback((t: string) => sendRef.current(t), []);

  // New function to handle summarization
  const handleSummarize = async (text: string, source: string) => {
    setLoading(true);

    // Add user message showing what's being summarized
    const userMessage =
      source === "pdf"
        ? "Summarize this PDF for me"
        : "Summarize these notes for me";

    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);

    try {
      const response = await fetch(apiUrl("/api/summarize"), {
        method: "POST",
        headers: createApiHeaders(apiKey, {
          "Content-Type": "application/json",
        }),
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
      const message =
        error instanceof Error
          ? error.message
          : "Sorry, I encountered an error while summarizing the content.";
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
      setShowSummarizer(false);
      if (location.pathname === "/app/summarize") {
        navigate("/app");
      }
    }
  };

  // Function to handle video search requests from MessageBubble
  const handleVideoSearchFromMessage = async (query: string) => {
    if (loading) return;

    // Add the query as a user message
    setMessages((prev) => [...prev, { type: "user", content: query }]);
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: createApiHeaders(apiKey, {
          "Content-Type": "application/json",
        }),
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
      const message =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your video search request.";
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openSummarizer = () => {
    setShowToolTray(false);
    navigate("/app/summarize");
    setTimeout(() => scrollToBottom(), 100);
  };

  const closeSummarizer = () => {
    setShowSummarizer(false);
    if (location.pathname === "/app/summarize") {
      navigate("/app");
    }
  };

  const handleQuickActionSelection = (action: string) => {
    setShowToolTray(false);
    if (action === "Summarize text") {
      openSummarizer();
    } else if (action === "Whiteboard Integration") {
      handleWhiteboardTabCreate();
    } else {
      setMessage(action);
      textareaRef.current?.focus();
    }
  };

  const suggestedStarts = [
    {
      title: "Break down a concept",
      description: "Ask for a clearer explanation, examples, or practice ideas.",
      value: "Explain this topic in a simpler way and show one worked example.",
      icon: FiMessageSquare,
    },
    {
      title: "Turn notes into a summary",
      description: "Condense lecture notes, readings, or assignment prompts.",
      action: openSummarizer,
      icon: FiFileText,
    },
    {
      title: "Research a paper for me",
      description: "I find it, read it, and build the slide deck or report.",
      value: 'Find the paper "Attention Is All You Need", read it and make me a slide deck.',
      icon: FiSearch,
    },
    {
      title: "Sketch the problem out",
      description: "Open the whiteboard and analyze equations or diagrams.",
      action: handleWhiteboardTabCreate,
      icon: FiEdit3,
    },
  ];

  return (
    <div className="app-shell flex h-screen flex-col text-[color:var(--text)] transition-colors duration-300">
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        authLoading={authLoading}
        user={authUser}
        onLogout={handleLogout}
      />

      <ConversationTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabCreate={handleTabCreate}
        onTabDelete={handleTabDelete}
        onTabRename={handleTabRename}
      />

      <main className="mx-auto flex w-full max-w-[96rem] flex-1 gap-4 overflow-hidden px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
        {activeTab.type === "whiteboard" ? (
          // Whiteboard in full-screen mode
          <div className="flex h-full min-w-0 flex-1 overflow-hidden rounded-[28px] panel-surface">
            <Whiteboard
              onAnalyze={handleWhiteboardAnalyze}
              isAnalyzing={whiteboardAnalyzing}
              isModal={false}
            />
          </div>
        ) : (
          // Chat view with messages
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] panel-surface">
            <div
              className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700 scrollbar-track-transparent"
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
              <div className="conversation-content mx-auto flex w-full max-w-[54rem] flex-col px-4 py-6 sm:px-6 sm:py-8">
                {showEmptyState && (
                  <section className="animate-fade-in py-4 sm:py-5">
                    <div className="mx-auto max-w-[42rem] text-center">
                      <p className="caption-label mb-3">B.A.L.V.I.S. online</p>
                      <h2 className="headline-display text-[2rem] font-semibold leading-tight text-[color:var(--text)] sm:text-[2.5rem]">
                        {authUser?.name
                          ? `At your service, ${authUser.name.split(" ")[0]}.`
                          : "At your service."}
                      </h2>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)] sm:text-base">
                        Tap the core and speak, or type below. I can explain
                        concepts, summarize notes, find videos, and read your
                        whiteboard.
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {suggestedStarts.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() =>
                              item.action ? item.action() : setMessage(item.value ?? "")
                            }
                            className="group panel-strong rounded-[20px] p-4 text-left transition-colors duration-200 hover:border-[color:var(--accent)] hover:bg-[color:var(--surface)] sm:p-5"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                                <Icon className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="text-base font-semibold text-[color:var(--text)]">
                                    {item.title}
                                  </h3>
                                  <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5" />
                                </div>
                                <p className="mt-1.5 text-sm leading-5 text-[color:var(--muted)]">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {messages.map((msg, index) => (
                  <MessageBubble
                    key={index}
                    message={msg}
                    onVideoSearch={handleVideoSearchFromMessage}
                  />
                ))}
                {loading && (
                  <div className="mx-auto flex max-w-sm items-center gap-3 rounded-full bg-[color:var(--surface-strong)] px-5 py-3 text-sm text-[color:var(--muted)] shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] animate-bounce" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] animate-bounce delay-100" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] animate-bounce delay-200" />
                    </div>
                    {agentStatus || "Processing"}
                  </div>
                )}

                {/* TextSummarizer appears inside the scrollable area */}
                {showSummarizer && !loading && (
                  <div className="mx-auto my-6 w-full max-w-3xl">
                    <div className="panel-strong overflow-hidden rounded-[28px]">
                      <TextSummarizer
                        apiKey={apiKey}
                        onClose={closeSummarizer}
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
            <div className="border-t soft-divider bg-[color:var(--surface-strong)]/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
              <div className="mx-auto w-full max-w-[54rem]">
                <div className="space-y-3">
                  {showToolTray && (
                    <div className="panel-strong rounded-[20px] p-3 sm:p-4">
                      <QuickActions
                        onActionSelect={handleQuickActionSelection}
                        onCreateWhiteboardTab={handleWhiteboardTabCreate}
                      />
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)]/92 p-3 shadow-[0_10px_24px_rgba(28,24,20,0.08)]">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            // Regular Enter - submit the form
                            e.preventDefault();
                            if (message.trim() && !loading) {
                              sendMessage(message);
                            }
                          }
                          // Shift+Enter will naturally create a new line
                        }}
                        placeholder="Speak or type a command, sir"
                        className="min-h-[48px] w-full resize-none border-0 bg-transparent focus:ring-0 px-2 py-1 text-[15px] leading-7 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                        style={{
                          minHeight: "48px",
                          maxHeight: "180px",
                          overflowY: "auto",
                        }}
                        rows={1}
                        disabled={loading}
                      />

                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[color:var(--surface-border)] pt-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowToolTray((prev) => !prev)}
                            className="hud-button h-10"
                          >
                            Tools
                            {showToolTray ? (
                              <FiChevronUp className="h-4 w-4" />
                            ) : (
                              <FiChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={toggleVoiceReplies}
                            className="hud-button h-10 w-10 justify-center !px-0"
                            title={voiceReplies ? "Mute spoken replies" : "Speak replies aloud"}
                            aria-label={voiceReplies ? "Mute spoken replies" : "Speak replies aloud"}
                          >
                            {voiceReplies ? (
                              <FiVolume2 className="h-4 w-4" />
                            ) : (
                              <FiVolumeX className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocratic((v) => !v)}
                            className={`hud-button h-10 ${socratic ? "!border-[color:var(--accent)] !bg-[color:var(--accent)] !text-[color:var(--on-accent)]" : ""}`}
                            title="Socratic mode: I challenge and quiz instead of just answering"
                            aria-pressed={socratic}
                          >
                            <FiHelpCircle className="h-4 w-4" />
                            <span className="hidden xl:inline">Socratic</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPanelOpen((v) => !v)}
                            className="hud-button h-10 w-10 justify-center !px-0"
                            title="Toggle research workspace"
                            aria-label="Toggle research workspace"
                          >
                            <FiSidebar className="h-4 w-4" />
                          </button>
                        </div>

                        <VoiceInput
                          isListening={isListening}
                          setIsListening={setIsListening}
                          onSpeechResult={handleVoiceResult}
                          disabled={loading}
                          busy={loading}
                          speaking={speaking}
                        />

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-bold uppercase tracking-wider text-[color:var(--on-accent)] shadow-[0_0_16px_var(--glow)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                          >
                            {loading ? "Working" : "Send"}
                            <FiArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {panelOpen && (
          <aside className="fixed inset-x-3 bottom-3 top-24 z-40 overflow-hidden rounded-[28px] panel-surface lg:static lg:z-auto lg:block lg:w-[26rem] lg:shrink-0">
            <ResearchPanel
              tab={panelTab}
              onTabChange={setPanelTab}
              injectedPapers={injectedPapers}
              filesVersion={filesVersion}
              onDocChange={handleDocChange}
            />
          </aside>
        )}
      </main>

    </div>
  );
}

export default App;
