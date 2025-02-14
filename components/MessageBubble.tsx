import React from "react";

interface MessageBubbleProps {
  message: {
    type: "user" | "ai";
    content: string;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {

  // Function to format the message content for youtube videos
  const formatMessage = (content: string) => {
    const videoLinkRegex = /\[(.*?)\]\((https?:\/\/(?:www\.)?youtube\.com\/\S+)\)/;
    const match = content.match(videoLinkRegex);

    if (match) {
      const[fullMatch, title, url] = match;
      const embedUrl = url.replace('watch?v=', 'embed/');
      
      return (
        <div className="space-y-4">
          <div className="whitespace-pre-wrap">{content.replace(fullMatch, '')}</div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">{title}</h3>
            <div className="relative pt-[56.25%] w-full">
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allowFullScreen
                title={title}
              />
            </div>
          </div>
        </div>
      );
    };

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
          className={`text-base leading-relaxed tracking-wide whitespace-pre-wrap font-normal
          ${
            message.type === "user"
              ? "text-black"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {formatMessage(message.content)}
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
