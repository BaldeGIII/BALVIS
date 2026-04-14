import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdMic, MdMicOff } from "react-icons/md";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang?: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceInputProps {
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  isListening,
  setIsListening,
  onSpeechResult,
  disabled,
}) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const [voiceError, setVoiceError] = useState("");

  const speechRecognitionConstructor = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }, []);

  const stopMicStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!speechRecognitionConstructor) {
      return;
    }

    const recognition = new speechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      startingRef.current = false;
      setVoiceError("");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";

      if (text) {
        onSpeechResult(text);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const nextMessage =
        event.error === "not-allowed"
          ? "Microphone access is blocked. Allow microphone access in your browser settings."
          : event.error === "no-speech"
            ? "No speech was detected. Try speaking a little closer to the microphone."
            : "Voice input could not start. Check your microphone and browser permissions.";

      setVoiceError(nextMessage);
      startingRef.current = false;
      stopMicStream();
      setIsListening(false);
    };

    recognition.onend = () => {
      startingRef.current = false;
      stopMicStream();
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort?.();
      recognition.stop();
      recognitionRef.current = null;
      stopMicStream();
    };
  }, [onSpeechResult, setIsListening, speechRecognitionConstructor]);

  const prepareMicrophone = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "This browser cannot access microphone input. Try Chrome, Edge, or another supported browser."
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const hasActiveInput = stream.getAudioTracks().some((track) => track.enabled);

    if (!hasActiveInput) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("No active microphone input was found.");
    }

    streamRef.current = stream;
  };

  const handleToggle = async () => {
    if (disabled || startingRef.current) {
      return;
    }

    if (!speechRecognitionConstructor || !recognitionRef.current) {
      setVoiceError(
        "Voice input is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      setVoiceError("");
      startingRef.current = true;
      await prepareMicrophone();
      recognitionRef.current.start();
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Voice input could not start. Check your microphone permissions.";

      setVoiceError(nextMessage);
      startingRef.current = false;
      stopMicStream();
      setIsListening(false);
    }
  };

  const titleMessage = voiceError
    ? voiceError
    : isListening
      ? "Stop listening"
      : "Start voice input";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`inline-flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border transition-all duration-200 ${
          isListening
            ? "border-transparent bg-[color:var(--warm)] text-white shadow-[0_18px_35px_rgba(124,107,87,0.24)]"
            : voiceError
              ? "border-amber-400/70 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
              : "border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] text-[color:var(--text)] hover:bg-[color:var(--surface)]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={titleMessage}
        aria-label={titleMessage}
      >
        {isListening ? (
          <MdMicOff className="h-5 w-5" />
        ) : (
          <MdMic className="h-5 w-5" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {titleMessage}
      </span>
    </div>
  );
};

export default VoiceInput;
