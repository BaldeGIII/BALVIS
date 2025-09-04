import React, { useState, useEffect } from "react";

interface MessageBubbleProps {
  message: {
    type: "user" | "ai";
    content: string;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [videoError, setVideoError] = useState(false);
  const [processedContent, setProcessedContent] =
    useState<React.ReactNode>(null);

  // Process the message content when it changes
  useEffect(() => {
    setVideoError(false); // Reset error state for new messages
    setProcessedContent(formatMessage(message.content));
  }, [message.content]);

  const formatMessage = (content: string) => {
    // Enhanced regex to detect various YouTube URL formats
    const youtubeRegex =
      /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s\])]*)?\b/gi;
    const youtubeMatches = Array.from(content.matchAll(youtubeRegex));

    // If we found YouTube URLs and no video error, embed them
    if (youtubeMatches.length > 0 && !videoError) {
      const parts = [];
      let lastIndex = 0;

      youtubeMatches.forEach((match, index) => {
        const [fullMatch, videoId] = match;
        const matchStart = match.index || 0;

        // Add text before this match
        if (matchStart > lastIndex) {
          const textBefore = content.slice(lastIndex, matchStart);
          if (textBefore.trim()) {
            parts.push(
              <div key={`text-${index}`} className="whitespace-pre-wrap mb-4">
                {textBefore}
              </div>
            );
          }
        }

        // Extract video title from surrounding text (if available)
        const lines = content.split("\n");
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
      if (lastIndex < content.length) {
        const remainingText = content.slice(lastIndex);
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
    // Look for **[Title] by [Channel]** pattern and format them nicely
    const videoRecommendationRegex = /\*\*(.*?) by (.*?)\*\*/g;
    const videoRecMatches = Array.from(
      content.matchAll(videoRecommendationRegex)
    );

    if (videoRecMatches.length > 0) {
      const parts = [];
      let lastIndex = 0;

      videoRecMatches.forEach((match, index) => {
        const [fullMatch, title, channel] = match;
        const matchStart = match.index || 0;

        // Add text before this match
        if (matchStart > lastIndex) {
          const textBefore = content.slice(lastIndex, matchStart);
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
      if (lastIndex < content.length) {
        const remainingText = content.slice(lastIndex);
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

    // Fallback: if no YouTube URLs found or there was an error, show plain text
    return <div className="whitespace-pre-wrap">{content}</div>;
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
