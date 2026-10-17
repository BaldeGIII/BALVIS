/// <reference types="vite/client" />

// Exposed by desktop/preload.cjs inside the Electron app only.
interface Window {
  balvis?: {
    isDesktop: boolean;
    keyStatus: () => Promise<{ kimi: boolean; elevenlabs: boolean }>;
    setKey: (name: "kimi" | "elevenlabs", key: string) => Promise<boolean>;
    speak: (text: string) => Promise<boolean>;
    stopSpeech: () => Promise<void>;
  };
}
