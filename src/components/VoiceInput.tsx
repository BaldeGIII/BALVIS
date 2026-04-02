import React, { useEffect } from "react";
import { MdMic, MdMicOff } from "react-icons/md";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      onSpeechResult(text);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening, onSpeechResult, setIsListening]);

  return (
    <button
      type="button"
      onClick={() => setIsListening(!isListening)}
      disabled={disabled}
      className={`inline-flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border transition-all duration-200
                ${
                  isListening
                    ? "border-transparent bg-[color:var(--warm)] text-white shadow-[0_18px_35px_rgba(182,116,67,0.28)]"
                    : "border-[color:var(--surface-border)] bg-white/70 text-[color:var(--text)] hover:bg-white dark:bg-black/10"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? (
        <MdMicOff className="h-5 w-5" />
      ) : (
        <MdMic className="h-5 w-5" />
      )}
    </button>
  );
};

export default VoiceInput;
