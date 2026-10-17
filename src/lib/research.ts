import { apiUrl } from "./api";

export interface Paper {
  title: string;
  authors: string[];
  date: string;
  abstract: string;
  url: string;
  source: string;
}

export interface Screening {
  methodology: string;
  validity: string;
  concerns: string[];
  verdict: "include" | "maybe" | "exclude";
  reason: string;
}

export interface Slide {
  heading: string;
  bullets: string[];
  visual: string;
}

export interface Analysis {
  title: string;
  thesis: string;
  methodologies: string[];
  arguments: string[];
  evidence: string[];
  slides: Slide[];
}

export interface Doc {
  name: string;
  text: string;
  analysis?: Analysis;
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Request failed. Please try again.");
  }
  return payload;
}

const postJson = async <T>(path: string, body: unknown): Promise<T> =>
  readJson(
    await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

export const searchPapers = async (query: string) =>
  (await readJson(
    await fetch(apiUrl(`/api/papers?q=${encodeURIComponent(query)}`))
  )) as { papers: Paper[]; status: Record<string, string> };

export const screenPaper = (paper: Paper) =>
  postJson<Screening>("/api/screen-paper", {
    title: paper.title,
    abstract: paper.abstract,
  });

export const analyzeDocument = (text: string) =>
  postJson<Analysis>("/api/analyze-document", { text });

export async function extractPdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const payload = await readJson(
    await fetch(apiUrl("/api/extract-pdf"), { method: "POST", body: formData })
  );
  return payload.text as string;
}

// Context handed to the chat so questions are grounded in the open document.
export const docContext = (doc: Doc) =>
  [
    `Document: ${doc.name}`,
    doc.analysis ? `Thesis: ${doc.analysis.thesis}` : "",
    doc.text,
  ]
    .filter(Boolean)
    .join("\n");

const SAVED_KEY = "balvis_saved_papers";

export const loadSavedPapers = (): Paper[] => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
};

export const storeSavedPapers = (papers: Paper[]) =>
  localStorage.setItem(SAVED_KEY, JSON.stringify(papers));
