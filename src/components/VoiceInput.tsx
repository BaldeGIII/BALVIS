import React, { useEffect, useRef, useState } from "react";
import { MdMic, MdMicOff } from "react-icons/md";
import { describeMicError } from "../lib/speech";
import { cleanTranscript, loadSpeechModel, transcribe, VoiceListener } from "../lib/stt";

interface VoiceInputProps {
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
  busy?: boolean;
  speaking?: boolean;
}

// Tap the core, say one thing, and it is transcribed locally (see lib/stt.ts) and sent.
const VoiceInput: React.FC<VoiceInputProps> = ({
  isListening,
  setIsListening,
  onSpeechResult,
  disabled,
  busy,
  speaking,
}) => {
  const listenerRef = useRef<VoiceListener | null>(null);
  const startingRef = useRef(false);
  const [status, setStatus] = useState("");

  const stop = () => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    setIsListening(false);
  };

  useEffect(() => () => listenerRef.current?.stop(), []);

  const handleToggle = async () => {
    if (disabled || startingRef.current) return;
    if (listenerRef.current) {
      stop();
      return;
    }

    startingRef.current = true;
    setStatus("");
    try {
      setStatus("Loading speech model…");
      await loadSpeechModel((percent) => setStatus(`Loading speech model ${percent}%`));
      setStatus("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      listenerRef.current = new VoiceListener(stream, {
        onUtterance: async (audio) => {
          stop();
          setStatus("Transcribing…");
          const text = cleanTranscript(await transcribe(audio));
          setStatus(text ? "" : "I did not catch that. Try again.");
          if (text) onSpeechResult(text);
        },
      });
      setIsListening(true);
    } catch (error) {
      setStatus(
        error instanceof DOMException
          ? describeMicError(error)
          : "The speech model could not load. It downloads once, so check your internet connection and try again."
      );
    } finally {
      startingRef.current = false;
    }
  };

  const orbState = isListening ? "listening" : speaking ? "speaking" : busy ? "thinking" : "idle";
  const title = status || (isListening ? "Stop listening" : "Start voice input");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        data-state={orbState}
        className="orb"
        title={title}
        aria-label={title}
      >
        <span className="orb-ring orb-ring-1" />
        <span className="orb-ring orb-ring-2" />
        <span className="orb-ring orb-ring-3" />
        <span className="orb-core">
          {isListening ? <MdMicOff className="h-5 w-5" /> : <MdMic className="h-5 w-5" />}
        </span>
      </button>
      {status && (
        <p className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 text-center text-xs text-[color:var(--warm)]">
          {status}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {title}
      </span>
    </div>
  );
};

export default VoiceInput;
