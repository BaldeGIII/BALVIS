import { useEffect, useRef, useState } from "react";
import {
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiFileText,
  FiDownload,
  FiMaximize,
  FiRefreshCw,
  FiSearch,
  FiUpload,
} from "react-icons/fi";
import { fileDownloadUrl, listWorkspaceFiles, openWorkspaceFile, type WorkspaceFile } from "../lib/agent";
import {
  analyzeDocument,
  extractPdf,
  loadSavedPapers,
  screenPaper,
  searchPapers,
  storeSavedPapers,
  type Doc,
  type Paper,
  type Screening,
} from "../lib/research";

export type PanelTab = "papers" | "document" | "slides" | "files";

interface ResearchPanelProps {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  // Papers the agent found, pushed in so the panel shows them too.
  injectedPapers: { papers: Paper[]; status: Record<string, string>; n: number } | null;
  // Bumped whenever the agent creates a file.
  filesVersion: number;
  onDocChange: (doc: Doc | null) => void;
}

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: "papers", label: "Papers" },
  { id: "document", label: "Document" },
  { id: "slides", label: "Slides" },
  { id: "files", label: "Files" },
];

const VERDICT_STYLE = {
  include: "text-emerald-400",
  maybe: "text-[color:var(--accent)]",
  exclude: "text-red-400",
};

const List = ({ title, items }: { title: string; items: string[] }) =>
  items?.length ? (
    <div className="mt-4">
      <p className="caption-label mb-1.5">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-[color:var(--text)]">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  ) : null;

export default function ResearchPanel({
  tab,
  onTabChange,
  injectedPapers,
  filesVersion,
  onDocChange,
}: ResearchPanelProps) {
  // Papers
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [screenings, setScreenings] = useState<Record<string, Screening | "loading" | string>>({});
  const [saved, setSaved] = useState<Paper[]>(loadSavedPapers);
  const [showSaved, setShowSaved] = useState(false);

  // Documents
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docIndex, setDocIndex] = useState(0);
  const [busy, setBusy] = useState("");
  const [docError, setDocError] = useState("");

  // Files
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [folder, setFolder] = useState("");
  const [fileError, setFileError] = useState("");

  // Slides
  const [slideIndex, setSlideIndex] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);

  const doc = docs[docIndex] as Doc | undefined;
  const slides = doc?.analysis?.slides ?? [];

  useEffect(() => {
    onDocChange(doc ?? null);
  }, [doc, onDocChange]);

  const runSearch = async (q: string) => {
    const topic = q.trim();
    if (!topic) return;
    setQuery(topic);
    setSearching(true);
    setSearchError("");
    setShowSaved(false);
    try {
      const result = await searchPapers(topic);
      setPapers(result.papers);
      setSourceStatus(result.status);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!injectedPapers) return;
    setPapers(injectedPapers.papers);
    setSourceStatus(injectedPapers.status);
    setShowSaved(false);
  }, [injectedPapers]);

  const refreshFiles = async () => {
    try {
      const result = await listWorkspaceFiles();
      setFiles(result.files);
      setFolder(result.folder);
      setFileError("");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not list files.");
    }
  };

  useEffect(() => {
    if (tab === "files") refreshFiles();
  }, [tab, filesVersion]);

  const screen = async (paper: Paper) => {
    setScreenings((prev) => ({ ...prev, [paper.url]: "loading" }));
    try {
      const result = await screenPaper(paper);
      setScreenings((prev) => ({ ...prev, [paper.url]: result }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screening failed.";
      setScreenings((prev) => ({ ...prev, [paper.url]: `error:${message}` }));
    }
  };

  const toggleSaved = (paper: Paper) => {
    const next = saved.some((p) => p.url === paper.url)
      ? saved.filter((p) => p.url !== paper.url)
      : [...saved, paper];
    setSaved(next);
    storeSavedPapers(next);
  };

  const handleFiles = async (files: FileList | null) => {
    const pdfs = Array.from(files ?? []).filter((f) => /\.pdf$/i.test(f.name));
    if (pdfs.length === 0) {
      setDocError("Choose one or more PDF files.");
      return;
    }

    setDocError("");
    const added: Doc[] = [];
    for (const file of pdfs) {
      try {
        setBusy(`Reading ${file.name}`);
        const text = await extractPdf(file);
        setBusy(`Analyzing ${file.name}`);
        added.push({ name: file.name, text, analysis: await analyzeDocument(text) });
      } catch (error) {
        setDocError(
          `${file.name}: ${error instanceof Error ? error.message : "could not be processed."}`
        );
      }
    }
    setBusy("");

    if (added.length > 0) {
      setDocIndex(docs.length);
      setDocs((prev) => [...prev, ...added]);
      setSlideIndex(0);
      onTabChange("document");
    }
  };

  const renderPaper = (paper: Paper) => {
    const screening = screenings[paper.url];
    const isSaved = saved.some((p) => p.url === paper.url);
    const summary =
      paper.abstract.length > 280 ? `${paper.abstract.slice(0, 280)}…` : paper.abstract;

    return (
      <li key={paper.url} className="panel-strong rounded-[18px] p-4">
        <a
          href={paper.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex items-start gap-2 text-[15px] font-semibold leading-snug text-[color:var(--text)] hover:text-[color:var(--accent)]"
        >
          <span>{paper.title}</span>
          <FiExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 opacity-60" />
        </a>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {paper.authors.slice(0, 3).join(", ")}
          {paper.authors.length > 3 ? " et al." : ""} · {paper.date} · {paper.source}
        </p>
        {summary && (
          <p className="mt-2 text-sm leading-6 text-[color:var(--text)]/85">{summary}</p>
        )}

        {screening === "loading" && (
          <p className="mt-3 text-sm text-[color:var(--muted)]">Screening…</p>
        )}
        {typeof screening === "string" && screening.startsWith("error:") && (
          <p className="mt-3 text-sm text-red-400">{screening.slice(6)}</p>
        )}
        {screening && typeof screening === "object" && (
          <div className="mt-3 rounded-xl border border-[color:var(--surface-border)] p-3 text-sm leading-6">
            <p className={`font-semibold uppercase tracking-wider ${VERDICT_STYLE[screening.verdict]}`}>
              {screening.verdict} · {screening.reason}
            </p>
            <p className="mt-1">
              <span className="text-[color:var(--muted)]">Methodology: </span>
              {screening.methodology}
            </p>
            <p className="mt-1">
              <span className="text-[color:var(--muted)]">Validity: </span>
              {screening.validity}
            </p>
            {screening.concerns?.length > 0 && (
              <p className="mt-1">
                <span className="text-[color:var(--muted)]">Concerns: </span>
                {screening.concerns.join("; ")}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" className="hud-button h-8 !px-3 text-xs" onClick={() => screen(paper)}>
            Screen
          </button>
          <button type="button" className="hud-button h-8 !px-3 text-xs" onClick={() => toggleSaved(paper)}>
            <FiBookmark className="h-3.5 w-3.5" />
            {isSaved ? "Saved" : "Approve & save"}
          </button>
        </div>
      </li>
    );
  };

  const renderPapers = () => {
    const shown = showSaved ? saved : papers;
    const failed = Object.entries(sourceStatus).filter(([, v]) => v !== "ok");

    return (
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search literature"
            className="min-w-0 flex-1 rounded-full border border-[color:var(--surface-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)] focus:ring-0"
          />
          <button type="submit" disabled={searching} className="hud-button h-10 w-10 justify-center !px-0" aria-label="Search papers">
            <FiSearch className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--muted)]">
          <span>
            {searching
              ? "Searching arXiv, Semantic Scholar…"
              : showSaved
                ? `${saved.length} saved`
                : `${papers.length} results`}
          </span>
          <button type="button" className="underline" onClick={() => setShowSaved((v) => !v)}>
            {showSaved ? "Back to results" : `Saved collection (${saved.length})`}
          </button>
        </div>

        {searchError && <p className="mt-3 text-sm text-red-400">{searchError}</p>}
        {!showSaved && failed.length > 0 && (
          <p className="mt-3 text-xs text-[color:var(--accent)]">
            Unavailable right now: {failed.map(([name]) => name).join(", ")} (often a rate limit; try again shortly).
          </p>
        )}

        <ul className="mt-3 space-y-3">{shown.map(renderPaper)}</ul>
        {!searching && shown.length === 0 && (
          <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
            {showSaved
              ? "Approve a paper to add it to your collection."
              : "Search a topic, or say “find papers on …”."}
          </p>
        )}
      </div>
    );
  };

  const renderDocument = () => (
    <div>
      <label className="hud-button inline-flex h-10 cursor-pointer">
        <FiUpload className="h-4 w-4" />
        Upload PDFs
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <p className="mt-3 text-sm text-[color:var(--muted)]">{busy}…</p>}
      {docError && <p className="mt-3 text-sm text-red-400">{docError}</p>}

      {docs.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {docs.map((d, i) => (
            <button
              key={`${d.name}-${i}`}
              type="button"
              onClick={() => {
                setDocIndex(i);
                setSlideIndex(0);
              }}
              className={`hud-button h-8 max-w-[10rem] truncate !px-3 text-xs ${i === docIndex ? "!border-[color:var(--accent)]" : ""}`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {doc?.analysis ? (
        <div className="mt-4 panel-strong rounded-[18px] p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--text)]">
            <FiFileText className="h-4 w-4 text-[color:var(--accent)]" />
            {doc.analysis.title || doc.name}
          </p>
          <div className="mt-3">
            <p className="caption-label mb-1.5">Thesis</p>
            <p className="text-sm leading-6">{doc.analysis.thesis}</p>
          </div>
          <List title="Methodologies" items={doc.analysis.methodologies} />
          <List title="Arguments" items={doc.analysis.arguments} />
          <List title="Evidence" items={doc.analysis.evidence} />
          <button type="button" className="hud-button mt-4 h-9" onClick={() => onTabChange("slides")}>
            View slide deck
          </button>
        </div>
      ) : (
        !busy && (
          <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
            Upload papers or notes as PDFs. I will pull out the thesis, methods, arguments and evidence,
            and build a slide deck. Then ask me about them in the chat.
          </p>
        )
      )}
    </div>
  );

  const renderFiles = () => (
    <div>
      <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
        <span className="truncate" title={folder}>{folder || "Your BALVIS folder"}</span>
        <button type="button" className="hud-button h-8 w-8 justify-center !px-0" onClick={refreshFiles} aria-label="Refresh files">
          <FiRefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {fileError && <p className="mt-3 text-sm text-red-400">{fileError}</p>}
      <ul className="mt-3 space-y-2">
        {files.map((file) => (
          <li key={file.name} className="panel-strong flex items-center gap-2 rounded-[14px] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[color:var(--text)]" title={file.name}>{file.name}</p>
              <p className="text-xs text-[color:var(--muted)]">
                {(file.size / 1024).toFixed(file.size < 10240 ? 1 : 0)} KB · {new Date(file.modified).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="hud-button h-8 !px-3 text-xs"
              onClick={() => openWorkspaceFile(file.name).catch((e) => setFileError(e.message))}
            >
              Open
            </button>
            <a href={fileDownloadUrl(file.name)} download className="hud-button h-8 w-8 justify-center !px-0" aria-label={`Download ${file.name}`}>
              <FiDownload className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
      {files.length === 0 && !fileError && (
        <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
          Nothing here yet. Ask for something like “find the paper on transformers, read it and make me a slide deck”.
        </p>
      )}
    </div>
  );

  const renderSlides = () => {
    if (slides.length === 0) {
      return (
        <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
          No deck yet. Upload a PDF in the Document tab and I will build one.
        </p>
      );
    }

    const slide = slides[Math.min(slideIndex, slides.length - 1)];
    const go = (delta: number) =>
      setSlideIndex((i) => Math.min(Math.max(i + delta, 0), slides.length - 1));

    return (
      <div
        ref={deckRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="flex h-full flex-col bg-[color:var(--bg)] outline-none"
      >
        <div className="panel-strong flex min-h-[18rem] flex-1 flex-col rounded-[18px] p-6">
          <p className="caption-label">
            {slideIndex + 1} / {slides.length}
          </p>
          <h3 className="headline-display mt-2 text-xl font-semibold text-[color:var(--text)]">
            {slide.heading}
          </h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
            {slide.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
          {slide.visual && (
            <p className="mt-auto rounded-xl border border-dashed border-[color:var(--surface-border)] p-3 text-xs text-[color:var(--muted)]">
              Suggested visual: {slide.visual}
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" className="hud-button h-9 w-9 justify-center !px-0" onClick={() => go(-1)} aria-label="Previous slide">
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hud-button h-9"
            onClick={() => deckRef.current?.requestFullscreen?.()}
          >
            <FiMaximize className="h-4 w-4" />
            Present
          </button>
          <button type="button" className="hud-button h-9 w-9 justify-center !px-0" onClick={() => go(1)} aria-label="Next slide">
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b soft-divider p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              tab === t.id
                ? "bg-[color:var(--accent)] text-[color:var(--on-accent)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "papers" && renderPapers()}
        {tab === "document" && renderDocument()}
        {tab === "slides" && renderSlides()}
        {tab === "files" && renderFiles()}
      </div>
    </div>
  );
}
