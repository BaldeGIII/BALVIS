import { apiUrl } from "./api";
import { createSessionHeaders } from "./auth";
import type { Paper } from "./research";

export type AgentEvent =
  | { type: "tool"; name: string; label: string }
  | { type: "tool_done"; name: string; ok: boolean; error?: string }
  | { type: "papers"; papers: Paper[]; status: Record<string, string> }
  | { type: "file"; name: string; format: string }
  | { type: "final"; reply: string }
  | { type: "error"; error: string };

export interface AgentRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
  mode?: "socratic";
  voice?: boolean;
  context?: string;
}

// The server streams one JSON event per line ("Reading paper...", "Creating pptx...", then the final reply).
export async function runAgent(request: AgentRequest, onEvent: (event: AgentEvent) => void) {
  const response = await fetch(apiUrl("/api/agent"), {
    method: "POST",
    credentials: "include",
    headers: await createSessionHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "The agent could not start.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;

      const event = JSON.parse(line) as AgentEvent;
      onEvent(event);
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "final") reply = event.reply;
    }
  }

  return reply;
}

export interface WorkspaceFile {
  name: string;
  size: number;
  modified: string;
}

export async function listWorkspaceFiles() {
  const response = await fetch(apiUrl("/api/files"), { credentials: "include" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not list files.");
  return payload as { files: WorkspaceFile[]; folder: string };
}

export async function openWorkspaceFile(name: string) {
  const response = await fetch(apiUrl("/api/files/open"), {
    method: "POST",
    credentials: "include",
    headers: await createSessionHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Could not open the file.");
}

export const fileDownloadUrl = (name: string) => apiUrl(`/api/files/${encodeURIComponent(name)}`);
