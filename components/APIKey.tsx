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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type={isVisible ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
        {apiKey.trim() ? (
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
      </form>
      <p className="text-gray-500 text-sm mt-2">
        Your API key is stored locally and never sent to any server except OpenAI
      </p>
    </div>
  );
};

export default APIKey;