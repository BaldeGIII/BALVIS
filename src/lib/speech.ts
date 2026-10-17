import { apiUrl } from "./api";

// Speech OUTPUT (text-to-speech) and microphone error text. Speech INPUT lives in stt.ts.

export function describeMicError(error: unknown) {
  const name = (error as DOMException)?.name;
  if (name === "NotFoundError") {
    return "No microphone was found. Plug one in or choose it in your system sound settings.";
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow the microphone for BALVIS in your system or browser settings.";
  }
  return "The microphone could not be started. Check that it is connected and not in use by another app.";
}

// British male voice if the system has one: a refined-butler register.
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|george|ryan/i.test(v.name)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    null
  );
}

interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
}

// ---- Natural voice (ElevenLabs, via our backend) ----

let naturalEnabled: boolean | null = null;
let stopNatural: (() => void) | null = null;

// Call after the key changes in Settings.
export const resetNaturalVoice = () => {
  naturalEnabled = null;
};

async function naturalVoiceEnabled() {
  if (naturalEnabled === null) {
    try {
      naturalEnabled = (await (await fetch(apiUrl("/api/tts/status"), { credentials: "include" })).json()).enabled;
    } catch {
      naturalEnabled = false;
    }
  }
  return naturalEnabled;
}

// Sentences, merged up to ~220 characters so each request is worth its round trip.
function toChunks(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const last = chunks.length - 1;
    if (last >= 0 && chunks[last].length + sentence.length < 220) chunks[last] += ` ${sentence}`;
    else chunks.push(sentence);
  }
  return chunks;
}

// Returns false if nothing was played (caller falls back to a local voice).
async function speakNatural(text: string, { onStart, onEnd }: SpeakHandlers) {
  let cancelled = false;
  let current: HTMLAudioElement | null = null;
  let release: (() => void) | null = null;
  stopNatural = () => {
    cancelled = true;
    current?.pause();
    release?.();
  };

  // Request every chunk up front so chunk N+1 is ready while chunk N plays.
  const requests = toChunks(text).map((chunk) => {
    const request = fetch(apiUrl("/api/tts"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunk }),
    }).then((response) => {
      if (!response.ok) throw new Error(`tts ${response.status}`);
      return response.blob();
    });
    request.catch(() => {}); // surfaced below, only when that chunk is awaited
    return request;
  });

  let started = false;
  try {
    for (const request of requests) {
      const blob = await request;
      if (cancelled) break;
      const url = URL.createObjectURL(blob);
      current = new Audio(url);
      if (!started) {
        started = true;
        onStart?.();
      }
      await new Promise<void>((resolve, reject) => {
        release = resolve;
        current!.onended = () => resolve();
        current!.onerror = () => reject(new Error("playback failed"));
        current!.play().catch(reject);
      });
      URL.revokeObjectURL(url);
      if (cancelled) break;
    }
  } catch {
    if (!started) {
      stopNatural = null;
      return false;
    }
  }

  stopNatural = null;
  onEnd?.();
  return true;
}

// ---- Local voices: the desktop app's system speech service, else the browser's ----

function speakInBrowser(text: string, { onStart, onEnd }: SpeakHandlers) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = pickVoice();
  utterance.pitch = 0.85;
  utterance.onstart = () => onStart?.();
  utterance.onend = utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function speakLocally(text: string, handlers: SpeakHandlers) {
  if (window.balvis) {
    handlers.onStart?.();
    window.balvis
      .speak(text)
      .then((ok) => (ok ? handlers.onEnd?.() : speakInBrowser(text, handlers)))
      .catch(() => speakInBrowser(text, handlers));
    return;
  }

  speakInBrowser(text, handlers);
}

function stopEverything() {
  stopNatural?.();
  stopNatural = null;
  window.balvis?.stopSpeech();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export const cancelSpeech = stopEverything;

export function speak(text: string, handlers: SpeakHandlers = {}) {
  const clean = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>]/g, "")
    .trim()
    .slice(0, 1200);

  if (!clean) {
    handlers.onEnd?.();
    return;
  }

  stopEverything();
  naturalVoiceEnabled().then(async (enabled) => {
    if (enabled && (await speakNatural(clean, handlers))) return;
    speakLocally(clean, handlers);
  });
}
