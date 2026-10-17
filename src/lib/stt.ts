// Main-thread side of local speech-to-text: model loading, transcription, and a voice-activity listener.

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 0;
const pending = new Map<number, (text: string) => void>();

export function loadSpeechModel(onProgress?: (percent: number) => void) {
  if (ready) return ready;

  const files = new Map<string, { loaded: number; total: number }>();
  const w = new Worker(new URL("./stt.worker.ts", import.meta.url), { type: "module" });
  worker = w;

  ready = new Promise<void>((resolve, reject) => {
    w.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "progress" && msg.progress?.status === "progress") {
        files.set(msg.progress.file, { loaded: msg.progress.loaded, total: msg.progress.total });
        let loaded = 0;
        let total = 0;
        files.forEach((f) => {
          loaded += f.loaded;
          total += f.total;
        });
        if (total) onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
      } else if (msg.type === "ready") {
        resolve();
      } else if (msg.type === "error") {
        w.terminate();
        worker = null;
        ready = null;
        reject(new Error(msg.message));
      } else if (msg.type === "text") {
        pending.get(msg.id)?.(msg.text);
        pending.delete(msg.id);
      }
    };
    w.postMessage({ type: "load" });
  });

  return ready;
}

export const transcribe = (audio: Float32Array) =>
  new Promise<string>((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    worker!.postMessage({ type: "transcribe", id, audio }, [audio.buffer]);
  });

// Whisper invents text ("Thank you.", "[BLANK_AUDIO]") on near-silence; drop that.
export function cleanTranscript(text: string) {
  const clean = text.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim();
  return /^(thank you|thanks|thanks for watching|you|bye|okay|\.+)[.!]?$/i.test(clean) ? "" : clean;
}

const SAMPLE_RATE = 16000;
const CHUNK = 4096; // samples per processing block (~256 ms at 16 kHz)
const SILENCE_CHUNKS = 3; // ~0.8 s of quiet ends an utterance
const MIN_VOICED_CHUNKS = 2;
const MAX_CHUNKS = 60; // ~15 s cap

function resample(input: Float32Array, from: number) {
  if (from === SAMPLE_RATE) return input;
  const out = new Float32Array(Math.floor((input.length * SAMPLE_RATE) / from));
  for (let i = 0; i < out.length; i++) out[i] = input[Math.floor((i * from) / SAMPLE_RATE)];
  return out;
}

export interface ListenerOptions {
  onUtterance: (audio: Float32Array) => void;
  onLevel?: (level: number, wave: Uint8Array) => void;
}

// Records the mic, detects when you start and stop talking, and hands each utterance to onUtterance.
export class VoiceListener {
  paused = false; // set while BALVIS is speaking so it never hears itself

  private ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  private analyser = this.ctx.createAnalyser();
  private processor = this.ctx.createScriptProcessor(CHUNK, 1, 1);
  private raf = 0;
  private floor = 0.01; // running estimate of background noise
  private preroll: Float32Array[] = [];
  private chunks: Float32Array[] = [];
  private voiced = 0;
  private quiet = 0;
  private speaking = false;

  constructor(
    private stream: MediaStream,
    private options: ListenerOptions
  ) {
    this.ctx.resume();
    this.analyser.fftSize = 512;
    const source = this.ctx.createMediaStreamSource(stream);
    source.connect(this.analyser);
    source.connect(this.processor);
    this.processor.connect(this.ctx.destination); // required for onaudioprocess to fire; output is silent
    this.processor.onaudioprocess = (e) => this.handleChunk(new Float32Array(e.inputBuffer.getChannelData(0)));

    const wave = new Uint8Array(this.analyser.fftSize);
    const tick = () => {
      this.analyser.getByteTimeDomainData(wave);
      let sum = 0;
      for (const v of wave) sum += ((v - 128) / 128) ** 2;
      this.options.onLevel?.(Math.min(1, Math.sqrt(sum / wave.length) * 4), wave);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private reset() {
    this.chunks = [];
    this.voiced = 0;
    this.quiet = 0;
    this.speaking = false;
  }

  private handleChunk(chunk: Float32Array) {
    if (this.paused) {
      this.reset();
      this.preroll = [];
      return;
    }

    let sum = 0;
    for (const v of chunk) sum += v * v;
    const rms = Math.sqrt(sum / chunk.length);
    const loud = rms > Math.max(0.015, this.floor * 3);

    if (!this.speaking) {
      if (!loud) {
        this.floor = this.floor * 0.98 + rms * 0.02;
        this.preroll = [...this.preroll.slice(-1), chunk]; // keep one block so the first syllable isn't clipped
        return;
      }
      this.speaking = true;
      this.chunks = [...this.preroll];
    }

    this.chunks.push(chunk);
    if (loud) {
      this.voiced++;
      this.quiet = 0;
    } else {
      this.quiet++;
    }

    if (this.quiet >= SILENCE_CHUNKS || this.chunks.length >= MAX_CHUNKS) {
      const enough = this.voiced >= MIN_VOICED_CHUNKS;
      const audio = new Float32Array(this.chunks.length * CHUNK);
      this.chunks.forEach((c, i) => audio.set(c, i * CHUNK));
      this.reset();
      this.preroll = [];
      if (enough) this.options.onUtterance(resample(audio, this.ctx.sampleRate));
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.processor.onaudioprocess = null;
    this.processor.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    this.ctx.close();
  }
}
