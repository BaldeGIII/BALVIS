import React, { useState, useEffect, useRef } from "react";
import { FiArrowLeft, FiFileText, FiUploadCloud, FiX } from "react-icons/fi";
import { apiUrl, createApiHeaders } from "../lib/api";

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSummaryResult(text, "manual");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Please choose a PDF file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(apiUrl("/api/extract-pdf"), {
        method: "POST",
        headers: createApiHeaders(apiKey),
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      onSummaryResult(data.text, "pdf");
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      setUploadError("I couldn't read that PDF. Try another file or paste the text instead.");
      setIsUploading(false);
    }
  };

  const renderHeader = (title: string, description: string) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="caption-label mb-2">Summarize</p>
        <h3 className="text-2xl font-semibold text-[color:var(--text)]">
          {title}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--surface-border)] text-[color:var(--muted)] transition hover:bg-black/5 hover:text-[color:var(--text)] dark:hover:bg-white/10"
        aria-label="Close"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );

  if (mode === "select") {
    return (
      <div className="p-6 sm:p-7">
        {renderHeader(
          "Turn something dense into something usable",
          "Choose how you'd like to bring in the material. BALVIS can summarize pasted notes or pull text from a PDF first."
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className="group rounded-[24px] border border-[color:var(--surface-border)] bg-white/80 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white dark:bg-black/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
              <FiUploadCloud className="h-5 w-5" />
            </div>
            <h4 className="mt-5 text-base font-semibold text-[color:var(--text)]">
              Upload a PDF
            </h4>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Best for lecture slides, readings, or assignment handouts.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("manual")}
            className="group rounded-[24px] border border-[color:var(--surface-border)] bg-white/80 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white dark:bg-black/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
              <FiFileText className="h-5 w-5" />
            </div>
            <h4 className="mt-5 text-base font-semibold text-[color:var(--text)]">
              Paste text directly
            </h4>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Ideal for notes, reading excerpts, or rough ideas you want condensed.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "upload") {
    return (
      <div className="p-6 sm:p-7">
        {renderHeader(
          "Upload a PDF",
          "BALVIS will extract the text first and then turn it into a clean summary."
        )}

        <div
          className="mt-6 rounded-[24px] border border-dashed border-[color:var(--surface-border)] bg-white/60 p-10 text-center transition hover:bg-white/80 dark:bg-black/10"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
            <FiUploadCloud className="h-6 w-6" />
          </div>
          <p className="mt-5 text-base font-semibold text-[color:var(--text)]">
            Choose a PDF to summarize
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Click here to select a file. PDFs only.
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
          <p className="mt-4 text-sm font-medium text-[color:var(--accent)]">
            Reading the document now...
          </p>
        )}
        {uploadError && (
          <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-400">
            {uploadError}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode("select")}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-black/5 hover:text-[color:var(--text)] dark:hover:bg-white/10"
            disabled={isUploading}
          >
            <FiArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[color:var(--text)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            disabled={isUploading}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-7">
      {renderHeader(
        "Paste the text you want summarized",
        "A few paragraphs or a full page are both fine. BALVIS will condense the main ideas and keep the important details."
      )}

      <form onSubmit={handleManualSubmit} className="mt-6">
        <label
          htmlFor="text-to-summarize"
          className="caption-label block text-left"
        >
          Source text
        </label>
        <textarea
          id="text-to-summarize"
          className="mt-3 h-56 w-full rounded-[24px] border border-[color:var(--surface-border)] bg-white/80 px-5 py-4 text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:bg-black/10"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your notes, reading, or assignment prompt here..."
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode("select")}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-black/5 hover:text-[color:var(--text)] dark:hover:bg-white/10"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create summary
          </button>
        </div>
      </form>
    </div>
  );
};

export default TextSummarizer;
