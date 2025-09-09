import React, { useState, useRef, useEffect } from "react";

interface TextSummarizerProps {
  onSummaryResult: (text: string, source: string) => void;
  apiKey: string;
  onClose: () => void;
}

const TextSummarizer: React.FC<TextSummarizerProps> = ({
  onSummaryResult,
  apiKey,
  onClose,
}) => {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [mode, setMode] = useState<"select" | "manual" | "upload">("select");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Handle click outside modal to close it
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Pass the text directly to the parent component for processing
    onSummaryResult(text, "manual");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept PDF files
    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:3001/api/extract-pdf", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Send the extracted text to be summarized
      onSummaryResult(data.text, "pdf");
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      setUploadError("Failed to process PDF. Please try again.");
      setIsUploading(false);
    }
  };

  // Common content based on mode
  const renderContent = () => {
    if (mode === "select") {
      return (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              How would you like to summarize text?
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode("upload")}
              className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-3 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload a PDF
            </button>
            <button
              onClick={() => setMode("manual")}
              className="px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-3 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Enter Text Manually
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 mt-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      );
    }

    if (mode === "upload") {
      return (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload PDF to Summarize
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8
                        flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Click to upload a PDF file or drag and drop
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Only PDF files are supported
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileUpload}
              />
            </div>
            {isUploading && (
              <div className="mt-3 flex justify-center items-center text-blue-500">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing PDF...
              </div>
            )}
            {uploadError && (
              <div className="mt-3 text-red-500 text-sm">{uploadError}</div>
            )}
          </div>

          <div className="flex justify-between gap-3">
            <button
              onClick={() => setMode("select")}
              className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isUploading}
            >
              Back
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg"
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Enter Text to Summarize
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleManualSubmit}>
          <div className="mb-6">
            <label
              htmlFor="text-to-summarize"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Paste your text below
            </label>
            <textarea
              id="text-to-summarize"
              className="w-full p-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                        text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the text you want to summarize here..."
              style={{ height: "200px" }}
            />
          </div>

          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setMode("select")}
              className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Summarize Text
            </button>
          </div>
        </form>
      </>
    );
  };

  return (
    <div className="w-full">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-xl"></div>
      <div className="p-6">{renderContent()}</div>
    </div>
  );
};

export default TextSummarizer;
