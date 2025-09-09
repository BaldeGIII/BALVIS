import React, { useState, useEffect } from "react";

interface MessageBubbleProps {
  message: {
    type: "user" | "ai";
    content: string;
    originalText?: string;
  };
  onVideoSearch?: (query: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onVideoSearch,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [processedContent, setProcessedContent] =
    useState<React.ReactNode>(null);

  // Process the message content when it changes
  useEffect(() => {
    setVideoError(false); // Reset error state for new messages
    setProcessedContent(formatMessage(message.content));
  }, [message.content]);

  // Helper function to detect if content is a summary (only from text summarizer)
  const isSummaryContent = (content: string) => {
    const lowerContent = content.toLowerCase();
    // Detect summaries more broadly
    return (
      lowerContent.startsWith("summary:") ||
      lowerContent.includes("the text presents") ||
      lowerContent.includes("algorithmic problems") ||
      lowerContent.includes("overall, the text") ||
      (lowerContent.includes("summary") &&
        (lowerContent.includes("text") ||
          lowerContent.includes("document") ||
          lowerContent.includes("content") ||
          lowerContent.includes("analysis")))
    );
  };

  // Extract meaningful topics from summary content
  const extractMultipleTopicsFromSummary = (content: string): string[] => {
    // Remove the "Summary:" prefix and get the actual content
    let text = content.replace(/^summary:?\s*/i, "").trim();

    const topics: string[] = [];

    // Map specific problem names to educational search terms
    const problemMappings: { [key: string]: string } = {
      "card flipper": "binary search algorithm tutorial",
      "fibonacci fun": "fibonacci algorithm matrix exponentiation",
      "good goblins": "majority element algorithm truth tellers problem",
      "local minimum": "binary search local minimum algorithm",
      "truth-tellers": "majority element algorithm computer science",
      "matrix exponentiation": "fast matrix exponentiation fibonacci",
      "pairwise testing": "majority element algorithm",
      "runtime analysis": "algorithm complexity analysis tutorial",
      "proof of correctness": "algorithm correctness proof techniques",
    };

    // Check for mapped problems first
    for (const [problem, educational] of Object.entries(problemMappings)) {
      if (text.toLowerCase().includes(problem)) {
        topics.push(educational);
      }
    }

    // Look for direct educational terms
    const educationalTerms = [
      /\b(binary search|linear search|depth.?first|breadth.?first|dijkstra|bellman.?ford|floyd.?warshall|quicksort|mergesort|heapsort)\b/gi,
      /\b(fibonacci sequence|fibonacci algorithm|matrix exponentiation|fast exponentiation|dynamic programming|greedy algorithm|divide and conquer)\b/gi,
      /\b(graph theory|tree algorithms|sorting algorithms|search algorithms|optimization algorithms)\b/gi,
      /\b(time complexity|space complexity|algorithm analysis|computational complexity|big o notation)\b/gi,
      /\b(recursion|iteration|induction|proof techniques|correctness proofs)\b/gi,
    ];

    for (const pattern of educationalTerms) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const term = match[1].trim() + " tutorial";
        if (
          !topics.some((topic) =>
            topic.toLowerCase().includes(match[1].toLowerCase())
          )
        ) {
          topics.push(term);
        }
      }
    }

    // If we found specific algorithmic content, create focused educational searches
    if (
      text.toLowerCase().includes("fibonacci") &&
      !topics.some((t) => t.includes("fibonacci"))
    ) {
      topics.push("fibonacci algorithm computer science tutorial");
    }

    if (
      text.toLowerCase().includes("binary search") &&
      !topics.some((t) => t.includes("binary search"))
    ) {
      topics.push("binary search algorithm explanation");
    }

    if (
      text.toLowerCase().includes("algorithm") &&
      text.toLowerCase().includes("analysis")
    ) {
      topics.push("algorithm complexity analysis computer science");
    }

    // Fallback to general algorithmic content if no specific terms found
    if (topics.length === 0) {
      if (text.toLowerCase().includes("algorithm")) {
        topics.push("computer science algorithms tutorial");
      } else {
        topics.push("computer science fundamentals");
      }
    }

    // Clean up and limit topics
    return topics
      .map((topic) => topic.toLowerCase().trim())
      .filter((topic, index, array) => array.indexOf(topic) === index) // Remove duplicates
      .slice(0, 3); // Limit to 3 searches max
  };

  const extractTopicFromSummary = (content: string) => {
    // This function now just returns the first topic from the multiple topics function
    const topics = extractMultipleTopicsFromSummary(content);
    return topics[0] || "algorithm tutorial";
  };

  const formatMessage = (content: string) => {
    // First, clean up any remaining ** formatting
    let cleanedContent = content.replace(/\*\*(.*?)\*\*/g, "$1");

    // Enhanced regex to detect various YouTube URL formats
    const youtubeRegex =
      /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s\])]*)?\b/gi;
    const youtubeMatches = Array.from(cleanedContent.matchAll(youtubeRegex));

    // If we found YouTube URLs and no video error, embed them
    if (youtubeMatches.length > 0 && !videoError) {
      const parts = [];
      let lastIndex = 0;

      youtubeMatches.forEach((match, index) => {
        const [fullMatch, videoId] = match;
        const matchStart = match.index || 0;

        // Add text before this match
        if (matchStart > lastIndex) {
          const textBefore = cleanedContent.slice(lastIndex, matchStart);
          if (textBefore.trim()) {
            parts.push(
              <div key={`text-${index}`} className="whitespace-pre-wrap mb-4">
                {textBefore}
              </div>
            );
          }
        }

        // Extract video title from surrounding text (if available)
        const lines = cleanedContent.split("\n");
        let videoTitle = "YouTube Video";
        for (const line of lines) {
          if (line.includes(fullMatch) && line.trim() !== fullMatch) {
            // Try to extract title from the line containing the URL
            const titleMatch = line.replace(fullMatch, "").trim();
            if (
              titleMatch &&
              titleMatch.length > 0 &&
              titleMatch.length < 200
            ) {
              videoTitle = titleMatch
                .replace(/^\d+\.\s*/, "")
                .replace(/^-\s*/, "")
                .trim();
            }
            break;
          }
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;

        // Add the embedded video
        parts.push(
          <div
            key={`video-${index}`}
            className="mt-4 mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
          >
            <h3 className="font-semibold p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
              {videoTitle}
            </h3>
            <div className="relative pt-[56.25%] w-full bg-black">
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={videoTitle}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => {
                  console.error(`Failed to load video: ${videoId}`);
                  setVideoError(true);
                }}
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800">
              <a
                href={fullMatch}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Watch on YouTube →
              </a>
            </div>
          </div>
        );

        lastIndex = matchStart + fullMatch.length;
      });

      // Add any remaining text after the last match
      if (lastIndex < cleanedContent.length) {
        const remainingText = cleanedContent.slice(lastIndex);
        if (remainingText.trim()) {
          parts.push(
            <div key="text-final" className="whitespace-pre-wrap mt-4">
              {remainingText}
            </div>
          );
        }
      }

      return <div className="space-y-2">{parts}</div>;
    }

    // Enhanced formatting for video recommendations without URLs
    // Only format as video recommendations if this looks like a video search response
    const isVideoSearchResponse =
      cleanedContent.includes("I found some great educational videos") ||
      cleanedContent.includes("YouTube video") ||
      cleanedContent.includes("Watch on YouTube");

    if (isVideoSearchResponse) {
      // Look for video recommendation patterns - should be at the start of a line or after a number
      const videoRecommendationRegex =
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^:\n]*?) by ([A-Z][^:\n]*?)(?:\s*-|\s*\n|$)/gm;
      const videoRecMatches = Array.from(
        cleanedContent.matchAll(videoRecommendationRegex)
      );

      if (videoRecMatches.length > 0) {
        const parts = [];
        let lastIndex = 0;

        videoRecMatches.forEach((match, index) => {
          const [fullMatch, title, channel] = match;
          const matchStart = match.index || 0;

          // Add text before this match
          if (matchStart > lastIndex) {
            const textBefore = cleanedContent.slice(lastIndex, matchStart);
            if (textBefore.trim()) {
              parts.push(
                <div key={`text-${index}`} className="whitespace-pre-wrap mb-2">
                  {textBefore}
                </div>
              );
            }
          }

          // Create a nicely formatted video recommendation card
          parts.push(
            <div
              key={`video-rec-${index}`}
              className="my-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                📺 {title}
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                by {channel}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Search for this video on YouTube to watch it
              </p>
            </div>
          );

          lastIndex = matchStart + fullMatch.length;
        });

        // Add any remaining text after the last match
        if (lastIndex < cleanedContent.length) {
          const remainingText = cleanedContent.slice(lastIndex);
          if (remainingText.trim()) {
            parts.push(
              <div key="text-final" className="whitespace-pre-wrap mt-2">
                {remainingText}
              </div>
            );
          }
        }

        return <div className="space-y-2">{parts}</div>;
      }
    }

    // Fallback: if no YouTube URLs found or there was an error, show plain text
    return <div className="whitespace-pre-wrap">{cleanedContent}</div>;
  };

  return (
    <div
      className={`w-full flex ${
        message.type === "user" ? "justify-end pl-8" : "justify-start pr-8"
      } mb-6`}
    >
      <div
        className={`relative max-w-[85%] md:max-w-[70%] animate-slide-in p-4 
        ${
          message.type === "user"
            ? "rounded-[20px] rounded-tr-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg"
            : "rounded-[20px] rounded-tl-sm bg-slate-100 dark:bg-gray-700 shadow-lg border border-slate-200 dark:border-gray-600"
        }
        transform transition-all duration-200 hover:scale-[1.02]`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center
            text-sm font-medium 
            ${
              message.type === "user"
                ? "bg-black/10 text-black"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            }`}
          >
            {message.type === "user" ? "" : "AI"}
          </div>
          <span
            className={`text-sm font-medium tracking-wide 
            ${
              message.type === "user"
                ? "text-black"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {message.type === "user" ? "You" : "BALVIS"}
          </span>
        </div>
        <div
          className={`text-base leading-relaxed tracking-wide font-normal
          ${
            message.type === "user"
              ? "text-white"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {processedContent || formatMessage(message.content)}
        </div>

        {/* Add "Find related videos" button for AI summary messages */}
        {message.type === "ai" &&
          onVideoSearch &&
          isSummaryContent(message.content) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  const topics = extractMultipleTopicsFromSummary(
                    message.originalText || message.content
                  );
                  // Combine all topics into one comprehensive search query
                  const combinedQuery = `Find educational videos about: ${topics.join(
                    ", "
                  )}`;
                  onVideoSearch(combinedQuery);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg 
                       bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40
                       text-blue-700 dark:text-blue-300 text-sm font-medium
                       transition-colors duration-200 border border-blue-200 dark:border-blue-800"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Find related videos
              </button>
            </div>
          )}

        <div
          className={`absolute top-0 ${
            message.type === "user"
              ? "-right-2 border-l-transparent border-l-[12px] border-blue-700"
              : "-left-2 border-r-transparent border-r-[12px] border-white dark:border-gray-700"
          } border-t-[12px] border-t-transparent`}
        ></div>
      </div>
    </div>
  );
};

export default MessageBubble;
