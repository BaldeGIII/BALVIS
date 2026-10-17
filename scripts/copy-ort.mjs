// Copies the ONNX runtime WebAssembly files next to the app so local speech-to-text works offline.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/ort", { recursive: true });
for (const file of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) {
  copyFileSync(`node_modules/onnxruntime-web/dist/${file}`, `public/ort/${file}`);
}
