import React, { useState, useEffect } from "react";

interface APIKeyProps {
  onKeySubmit: (key: string) => void;
}

const APIKey: React.FC<APIKeyProps> = ({ onKeySubmit }) => {
  const [apiKey, setApiKey] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isKeyStored, setIsKeyStored] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    setIsKeyStored(!!storedKey);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onKeySubmit(apiKey);
      setApiKey("");
      setIsKeyStored(true);
    }
  };

  const handleDelete = () => {
    localStorage.removeItem("openai_api_key");
    setIsKeyStored(false);
    onKeySubmit("");
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">API Key Settings</h3>
      
      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex w-full">
            <input
              type={isVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="flex-1 px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setIsVisible(!isVisible)}
              className="px-3 py-2 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 border-y border-r border-gray-300 dark:border-gray-500 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              {isVisible ? "Hide" : "Show"}
            </button>
          </div>
          
          <div className="flex justify-end gap-2">
            {apiKey.trim() ? (
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Set Key
              </button>
            ) : isKeyStored ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Delete API Key"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </div>
      
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
        Your API key is stored locally and never sent to any server except OpenAI
      </p>
    </div>
  );
};

export default APIKey;