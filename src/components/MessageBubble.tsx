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
    // Enhanced regex to match YouTube links in various formats with better group capturing
    const videoLinkRegex =
      /\[(.*?)\]\((https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|)([a-zA-Z0-9_-]{11})(?:[^\s)]*)?)\)/;
    const match = content.match(videoLinkRegex);

    console.log("Checking for YouTube embeds:", match ? "found" : "none"); // Debugging

    if (match && !videoError) {
      const [fullMatch, title, url, videoId] = match;

      console.log("Video embedding:", { title, url, videoId }); // Debugging

      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;

      return (
        <div className="space-y-4">
          <div className="whitespace-pre-wrap">
            {content.replace(fullMatch, "")}
          </div>
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
              {title}
            </h3>
            <div className="relative pt-[56.25%] w-full bg-black">
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={title}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => {
                  console.error("Video failed to load"); // Debugging
                  setVideoError(true);
                  setProcessedContent(
                    <div className="whitespace-pre-wrap">{content}</div>
                  );
                }}
                onLoad={(e) => {
                  console.log("Video iframe loaded");
                  // Try-catch needed because some browsers restrict iframe access
                  try {
                    const iframe = e.currentTarget;
                    if (iframe.contentWindow) {
                      console.log("Video loaded successfully");
                    }
                  } catch (error) {
                    // Silent catch - browsers restrict access to cross-origin iframes
                  }
                }}
              />
              {videoError && (
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-red-500 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Video Unavailable
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                    This video is no longer available or cannot be embedded.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Try watching on YouTube
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

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
