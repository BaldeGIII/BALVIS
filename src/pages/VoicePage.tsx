import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMessageSquare, FiPower } from "react-icons/fi";
import { openWorkspaceFile, runAgent } from "../lib/agent";
import type { Paper } from "../lib/research";
import { cancelSpeech, describeMicError, speak } from "../lib/speech";
import { cleanTranscript, loadSpeechModel, transcribe, VoiceListener } from "../lib/stt";
import { applyDarkMode } from "../lib/theme";

type Phase = "offline" | "loading" | "standby" | "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  offline: "OFFLINE",
  loading: "LOADING SPEECH MODEL...",
  standby: "STANDING BY",
  listening: "AWAITING INPUT...",
  thinking: "PROCESSING...",
  speaking: "TRANSMITTING...",
};

const HINT: Record<Phase, string> = {
  offline: "Initialize the core to begin. Microphone and speaker access are required.",
  loading: "First launch downloads the speech model once. After that it works offline.",
  standby: "Say “Balvis” followed by your question or command.",
  listening: "I'm listening, sir.",
  thinking: "",
  speaking: "",
};

// Whisper hears "Balvis" as all sorts of things ("Bob", "Bowes", "Bobbys"), so accept the usual suspects.
const WAKE =
  /\b(balvis|belvis|bal vis|bolvis|valvis|ballvis|bell vis|bovis|bulvis|balbis|palvis|calvis|bob|bobs|bobby|bobbys|bowes|bolivia|elvis)\b/i;
const FOLLOW_UP_MS = 30_000; // stay awake after a reply so the wake word isn't needed every turn

interface LogLine {
  who: "you" | "balvis" | "system";
  text: string;
}

type Nav = Navigator & {
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
  deviceMemory?: number;
  connection?: { effectiveType?: string };
};

const formatUptime = (s: number) =>
  [s / 3600, (s / 60) % 60, s % 60]
    .map((n) => String(Math.floor(n)).padStart(2, "0"))
    .join(":");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="font-semibold text-[color:var(--accent)]">{value}</span>
    </div>
  );
}

export default function VoicePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("offline");
  const [log, setLog] = useState<LogLine[]>([
    { who: "system", text: "Core idle. Awaiting initialization." },
  ]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [uptime, setUptime] = useState(0);
  const [battery, setBattery] = useState("n/a");
  const [socratic, setSocratic] = useState(false);
  // Off by default: always listening while powered on. On: only answer after hearing the name.
  const [wakeWord, setWakeWord] = useState(() => localStorage.getItem("balvis_wake_word") === "on");

  const coreRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const listenerRef = useRef<VoiceListener | null>(null);
  const wantListening = useRef(false);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const awakeUntil = useRef(0);
  const socraticRef = useRef(false);
  const wakeRef = useRef(wakeWord);
  const turn = useRef({ start: 0, stt: 0, llm: 0 }); // timings for the latency readout
  const history = useRef<Array<{ role: string; content: string }>>([]);
  // The listener outlives renders; it calls the latest handler through this ref.
  const latest = useRef<(text: string) => void>(() => {});

  const addLog = (who: LogLine["who"], text: string) =>
    setLog((prev) => [...prev.slice(-39), { who, text }]);

  // The HUD is a dark design; restore the user's theme on the way out.
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    applyDarkMode(true);
    return () => applyDarkMode(wasDark);
  }, []);

  useEffect(() => {
    const nav = navigator as Nav;
    nav.getBattery?.().then((b) =>
      setBattery(`${Math.round(b.level * 100)}%${b.charging ? " ⚡" : ""}`)
    );
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!wantListening.current) return;
      setUptime((u) => u + 1);
      if (!speakingRef.current && !busyRef.current) {
        setPhase(!wakeRef.current || Date.now() < awakeUntil.current ? "listening" : "standby");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(
    () => () => {
      wantListening.current = false;
      listenerRef.current?.stop();
      cancelSpeech();
    },
    []
  );

  const toggleWake = (on: boolean) => {
    wakeRef.current = on;
    setWakeWord(on);
    localStorage.setItem("balvis_wake_word", on ? "on" : "off");
  };

  // Time from the end of your speech to the first audio of the reply, split by stage.
  const logTurnTiming = () => {
    const { start, stt, llm } = turn.current;
    if (!start) return;
    const total = performance.now() - start;
    const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
    setLatency(Math.round(total));
    addLog("system", `heard ${sec(stt)} · model ${sec(llm)} · total ${sec(total)}`);
    turn.current.start = 0;
  };

  const deactivate = () => {
    wantListening.current = false;
    listenerRef.current?.stop();
    listenerRef.current = null;
    cancelSpeech();
    speakingRef.current = false;
    busyRef.current = false;
    awakeUntil.current = 0;
    coreRef.current?.style.setProperty("--level", "0");
    setUptime(0);
    setCaption("");
    setPhase("offline");
    addLog("system", "Core powered down.");
  };

  // Pause the listener while talking so BALVIS never hears itself.
  const say = (text: string, { then, stayAwake = true }: { then?: () => void; stayAwake?: boolean } = {}) => {
    addLog("balvis", text);
    history.current.push({ role: "assistant", content: text });
    setCaption(text);
    speakingRef.current = true;
    if (listenerRef.current) listenerRef.current.paused = true;
    speak(text, {
      onStart: () => {
        setPhase("speaking");
        logTurnTiming();
      },
      onEnd: () => {
        speakingRef.current = false;
        awakeUntil.current = stayAwake ? Date.now() + FOLLOW_UP_MS : 0;
        setPhase(stayAwake ? "listening" : "standby");
        if (listenerRef.current) listenerRef.current.paused = false;
        then?.();
      },
    });
  };

  const processCommand = async (command: string) => {
    busyRef.current = true;
    setPhase("thinking");
    addLog("you", command);
    setCaption(command);
    history.current.push({ role: "user", content: command });

    try {
      if (/\b(shut ?down|power (down|off)|turn (yourself )?off|deactivate)\b/i.test(command)) {
        say("Powering down. Goodbye, sir.", { then: deactivate });
        return;
      }

      if (/\b(text mode|type mode|typing mode|switch to text)\b/i.test(command)) {
        say("Switching to text mode, sir.", { then: () => navigate("/app") });
        return;
      }

      if (/\bsocratic\b/i.test(command)) {
        const on = !/\b(off|stop|disable|end)\b/i.test(command);
        socraticRef.current = on;
        setSocratic(on);
        say(on ? "Socratic mode engaged. I shall question rather than answer." : "Socratic mode disengaged, sir.");
        return;
      }

      if (/\b(go to sleep|stand ?by|that will be all|that's all|goodbye)\b/i.test(command)) {
        toggleWake(true);
        say("Very good, sir. Say my name when you need me.", { stayAwake: false });
        return;
      }

      // Everything else goes to the agent: it answers directly, or searches, reads papers and creates files.
      const started = performance.now();
      let acknowledged = false;
      const reply = await runAgent(
        {
          message: command,
          history: history.current.slice(-11, -1),
          voice: true,
          mode: socraticRef.current ? "socratic" : undefined,
        },
        (event) => {
          if (event.type === "tool") {
            addLog("system", event.label);
            setCaption(event.label);
            if (!acknowledged) {
              acknowledged = true; // a short spoken heads-up for jobs that will take a while
              if (listenerRef.current) listenerRef.current.paused = true;
              speak("On it, sir.", {
                onEnd: () => {
                  if (listenerRef.current && !speakingRef.current) listenerRef.current.paused = false;
                },
              });
            }
          }
          if (event.type === "papers") setPapers(event.papers.slice(0, 5));
          if (event.type === "file") setFiles((prev) => [event.name, ...prev.filter((n) => n !== event.name)].slice(0, 6));
        }
      );
      turn.current.llm = performance.now() - started;
      say(reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      addLog("system", message);
      say(
        message.includes("KIMI_API_KEY")
          ? "My language core has no API key, sir. Please add it in Settings."
          : message
      );
    } finally {
      busyRef.current = false;
    }
  };

  const handleUtterance = (raw: string) => {
    const text = raw.trim();
    if (!text || busyRef.current || speakingRef.current) return;

    const awake = !wakeRef.current || Date.now() < awakeUntil.current;
    if (!awake && !WAKE.test(text)) {
      setCaption("");
      return;
    }

    const command = text.replace(WAKE, "").replace(/^[\s,.:;!?-]+/, "").trim();
    if (!command) {
      say("Yes, sir?");
      return;
    }
    processCommand(command);
  };

  latest.current = handleUtterance;

  const handleLevel = (level: number, wave: Uint8Array) => {
    coreRef.current?.style.setProperty("--level", level.toFixed(3));
    const canvas = waveRef.current;
    const draw = canvas?.getContext("2d");
    if (!canvas || !draw) return;

    draw.clearRect(0, 0, canvas.width, canvas.height);
    draw.strokeStyle = getComputedStyle(canvas).color;
    draw.lineWidth = 1.5;
    draw.beginPath();
    wave.forEach((v, i) => {
      const x = (i / (wave.length - 1)) * canvas.width;
      const y = (v / 255) * canvas.height;
      if (i === 0) draw.moveTo(x, y);
      else draw.lineTo(x, y);
    });
    draw.stroke();
  };

  // Browsers only allow microphone and speech after a click, so this is the one tap needed.
  const initialize = async () => {
    setError("");
    setPhase("loading");
    try {
      await loadSpeechModel((percent) => setCaption(`Loading speech model ${percent}%`));
    } catch {
      setPhase("offline");
      setError("The speech model could not load. It downloads once, so check your internet connection and try again.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (micError) {
      setPhase("offline");
      setError(describeMicError(micError));
      return;
    }

    listenerRef.current?.stop();
    listenerRef.current = new VoiceListener(stream, {
      onLevel: handleLevel,
      onUtterance: async (audio) => {
        const idle = !busyRef.current && !speakingRef.current;
        const start = performance.now();
        const text = cleanTranscript(await transcribe(audio));
        if (idle && text) turn.current = { start, stt: performance.now() - start, llm: 0 };
        if (text) latest.current(text);
      },
    });
    wantListening.current = true;
    setCaption("");
    setPhase("listening");
    addLog("system", "Core online. Voice interface active.");
    say(
      wakeRef.current
        ? "All systems are online, sir. Say Balvis whenever you need me."
        : "All systems are online, sir. I am listening."
    );
  };

  const nav = navigator as Nav;
  const live = phase !== "offline" && phase !== "loading";

  return (
    <div className="app-shell flex h-screen flex-col text-[color:var(--text)]">
      <header className="relative z-10 flex items-start justify-between px-5 pt-4">
        <Link to="/app" className="hud-button h-10">
          <FiMessageSquare className="h-4 w-4" />
          Text mode
        </Link>
        <div className="text-center">
          <h1 className="headline-display text-xl font-semibold sm:text-2xl">B.A.L.V.I.S // AI CORE</h1>
          <p className="caption-label mt-1 text-[10px]">
            NEURAL NETWORK {live ? "ACTIVE" : "OFFLINE"}
          </p>
        </div>
        <div className="flex min-w-[7.5rem] items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => toggleWake(!wakeWord)}
            className={`hud-button h-10 text-xs ${wakeWord ? "!border-[color:var(--accent)]" : ""}`}
            title={wakeWord ? "Only answers after hearing “Balvis”" : "Always listening while powered on"}
            aria-pressed={wakeWord}
          >
            Wake word: {wakeWord ? "on" : "off"}
          </button>
          {live && (
            <button type="button" onClick={deactivate} className="hud-button h-10" title="Power off (or say “Balvis, shut down”)">
              <FiPower className="h-4 w-4" />
              <span className="hidden sm:inline">Power off</span>
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-4 px-5 py-3 lg:grid-cols-[17rem_1fr_19rem]">
        <aside className="hidden min-h-0 flex-col gap-4 lg:flex">
          <section className="panel-surface rounded-2xl p-4">
            <p className="caption-label mb-3">System status</p>
            <div className="space-y-2">
              <Row label="POWER" value={battery} />
              <Row label="CORES" value={String(navigator.hardwareConcurrency ?? "n/a")} />
              <Row label="MEMORY" value={nav.deviceMemory ? `${nav.deviceMemory} GB` : "n/a"} />
              <Row
                label="NETWORK"
                value={online ? `ONLINE${nav.connection?.effectiveType ? ` · ${nav.connection.effectiveType}` : ""}` : "OFFLINE"}
              />
              <Row label="LATENCY" value={latency ? `${latency} ms` : "—"} />
              <Row label="UPTIME" value={formatUptime(uptime)} />
              <Row label="MODE" value={socratic ? "SOCRATIC" : "STANDARD"} />
            </div>
          </section>
          <section className="panel-surface rounded-2xl p-4">
            <p className="caption-label mb-3">Voice input</p>
            <canvas ref={waveRef} width={300} height={80} className="h-20 w-full text-[color:var(--accent)]" />
          </section>
        </aside>

        <section className="flex min-h-0 items-center justify-center">
          <div
            ref={coreRef}
            data-phase={phase}
            className="jcore"
            onClick={cancelSpeech}
            title="Tap to interrupt"
          >
            <div className="jcore-plasma jcore-plasma-a" />
            <div className="jcore-plasma jcore-plasma-b" />
            <svg viewBox="0 0 400 400" className="jcore-rings" aria-hidden="true">
              <circle cx="200" cy="200" r="192" className="ring ring-ticks" />
              <circle cx="200" cy="200" r="172" className="ring ring-orange" />
              <circle cx="200" cy="200" r="150" className="ring ring-arc" />
              <circle cx="200" cy="200" r="122" className="ring ring-thin" />
              <circle cx="200" cy="200" r="96" className="ring ring-dash" />
            </svg>
            <div className="jcore-eye" />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <section className="panel-surface flex min-h-0 flex-1 flex-col rounded-2xl p-4">
            <p className="caption-label mb-3">Operational log</p>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-[13px] leading-5">
              {log.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.who === "you"
                      ? "text-[color:var(--warm)]"
                      : line.who === "balvis"
                        ? "text-[color:var(--text)]"
                        : "text-[color:var(--muted)]"
                  }
                >
                  <span className="opacity-60">{line.who === "you" ? "YOU > " : line.who === "balvis" ? "BALVIS > " : "SYS > "}</span>
                  {line.text}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </section>
          <section className="panel-surface hidden rounded-2xl p-4 sm:block">
            <p className="caption-label mb-3">Research feed</p>
            {papers.length === 0 ? (
              <p className="text-[13px] leading-5 text-[color:var(--muted)]">
                Try: “Balvis, find the Attention paper, read it and make a slide deck.” Papers I find appear here.
              </p>
            ) : (
              <ul className="space-y-1.5 text-[13px] leading-5">
                {papers.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noreferrer noopener" className="hover:text-[color:var(--accent)]">
                      {p.title}
                    </a>
                    <span className="text-[color:var(--muted)]"> · {p.source}</span>
                  </li>
                ))}
              </ul>
            )}
            {files.length > 0 && (
              <>
                <p className="caption-label mb-2 mt-4">Created files</p>
                <ul className="space-y-1 text-[13px] leading-5">
                  {files.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="text-left hover:text-[color:var(--accent)]"
                        onClick={() => openWorkspaceFile(name).catch((e) => addLog("system", e.message))}
                        title="Open"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>

      <footer className="relative z-10 px-5 pb-6 text-center">
        <p className="caption-label">B.A.L.V.I.S // {PHASE_LABEL[phase]}</p>
        <p className="mx-auto mt-2 min-h-[2.5rem] max-w-3xl text-lg leading-7">
          {caption || HINT[phase]}
        </p>
        {error && live && <p className="mx-auto mt-2 max-w-2xl text-sm text-[color:var(--warm)]">{error}</p>}
      </footer>

      {!live && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 hud-overlay px-6 text-center">
          <button type="button" onClick={initialize}
            disabled={phase === "loading"}
            className="hud-button h-14 px-8 text-base shadow-[0_0_24px_var(--glow)]"
          >
            {phase === "loading" ? "Loading…" : "Initialize BALVIS"}
          </button>
          <p className="max-w-md text-sm leading-6 text-[color:var(--muted)]">
            Voice-only mode. Needs microphone and speaker access. Speech recognition runs on this computer.
          </p>
          {phase === "loading" && <p className="max-w-lg text-sm text-[color:var(--accent)]">{caption}</p>}
          {error && <p className="max-w-lg text-sm leading-6 text-[color:var(--warm)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
