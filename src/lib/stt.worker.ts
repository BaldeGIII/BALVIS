// Local speech-to-text, so voice input needs no cloud service or API key. The model downloads once from the
// Hugging Face hub, then the browser/Electron cache serves it offline.
//
// Moonshine instead of Whisper: Whisper always encodes a fixed 30 s window, so even a 2 s command took ~4 s on
// a 4-thread CPU. Moonshine's cost scales with the audio length: ~0.6 s for the same clip, same transcript.
import { env, pipeline } from "@huggingface/transformers";

const MODEL = "onnx-community/moonshine-base-ONNX";

env.allowLocalModels = false;
const wasm = env.backends.onnx.wasm!;
// Threads need cross-origin isolation (the server sends COOP + COEP); without it, fall back to one.
wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
wasm.wasmPaths = {
  mjs: `${self.location.origin}/ort/ort-wasm-simd-threaded.jsep.mjs`,
  wasm: `${self.location.origin}/ort/ort-wasm-simd-threaded.jsep.wasm`,
};

type Asr = (audio: Float32Array) => Promise<{ text: string } | Array<{ text: string }>>;
let asr: Asr | null = null;

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === "load") {
    try {
      asr = (await pipeline("automatic-speech-recognition", MODEL, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress: unknown) => postMessage({ type: "progress", progress }),
      })) as unknown as Asr;
      postMessage({ type: "ready" });
    } catch (error) {
      postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (msg.type === "transcribe") {
    try {
      const out = await asr!(msg.audio);
      postMessage({ type: "text", id: msg.id, text: (Array.isArray(out) ? out[0] : out).text });
    } catch (error) {
      console.error("Transcription failed:", error);
      postMessage({ type: "text", id: msg.id, text: "" });
    }
  }
};
