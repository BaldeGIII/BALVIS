import React, { useEffect } from "react";
import { MdMic, MdMicOff } from "react-icons/md";

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
    if (
      (typeof window !== "undefined" && "SpeechRecognition" in window) ||
      "webkitSpeechRecognition" in window
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
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
    }
  }, [isListening]);

  return (
    <button
      type="button"
      onClick={() => setIsListening(!isListening)}
      disabled={disabled}
      className={`p-4 rounded-xl transition-all duration-200 flex items-center justify-center
                ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }
                disabled:opacity-50 disabled:cursor-not-allowed text-white`}
    >
      {isListening ? (
        <MdMicOff className="w-6 h-6" />
      ) : (
        <MdMic className="w-6 h-6" />
      )}
    </button>
  );
};

export default VoiceInput;
