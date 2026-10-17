import { useEffect, useState } from "react";
import { FiKey, FiVolume2 } from "react-icons/fi";
import type { IconType } from "react-icons";
import { resetNaturalVoice } from "../lib/speech";

type KeyName = "kimi" | "elevenlabs";

const FIELDS: Array<{ name: KeyName; title: string; hint: string; placeholder: string; icon: IconType }> = [
  {
    name: "kimi",
    title: "Kimi API key",
    hint: "Powers chat and analysis. Get one at platform.moonshot.ai.",
    placeholder: "sk-…",
    icon: FiKey,
  },
  {
    name: "elevenlabs",
    title: "ElevenLabs key (natural voice)",
    hint: "Optional. Gives BALVIS a natural spoken voice. Without it, the system voice is used.",
    placeholder: "Paste your ElevenLabs API key",
    icon: FiVolume2,
  },
];

function KeyField({ name, title, hint, placeholder, icon: Icon }: (typeof FIELDS)[number]) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.balvis?.keyStatus().then((status) => setHasKey(status[name]));
  }, [name]);

  const save = async (next: string) => {
    const saved = await window.balvis!.setKey(name, next);
    setHasKey(saved);
    setValue("");
    setMessage(next ? "Saved." : "Removed.");
    if (name === "elevenlabs") resetNaturalVoice();
  };

  return (
    <section className="panel-strong rounded-[28px] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-[color:var(--text)]">
            {title}
            {hasKey && <span className="ml-2 text-xs font-bold uppercase tracking-wider text-[color:var(--accent)]">set</span>}
          </p>
          <p className="text-sm text-[color:var(--muted)]">{hint}</p>
        </div>
      </div>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) save(value.trim());
        }}
      >
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-[color:var(--surface-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)] focus:ring-0"
        />
        <button type="submit" className="hud-button h-10">
          Save
        </button>
        {hasKey && (
          <button type="button" className="hud-button h-10" onClick={() => save("")}>
            Remove
          </button>
        )}
      </form>
      {message && <p className="mt-3 text-sm text-[color:var(--accent)]">{message}</p>}
    </section>
  );
}

// Desktop app only: keys are stored encrypted in the OS app-data folder, never in a .env file.
export default function ApiKeySettings() {
  if (!window.balvis) return null;
  return (
    <>
      {FIELDS.map((field) => (
        <KeyField key={field.name} {...field} />
      ))}
    </>
  );
}
