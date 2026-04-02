import React, { useRef, useState, useEffect } from "react";
import {
  FiDownload,
  FiEdit3,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";

interface WhiteboardProps {
  onAnalyze: (imageData: string) => void;
  onClose?: () => void;
  isAnalyzing: boolean;
  isModal?: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  onAnalyze,
  onClose,
  isAnalyzing,
  isModal = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"pen" | "eraser">("pen");
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#1d2824");
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setLastPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const startDrawingTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      setLastPos({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      });
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    drawLine(ctx, lastPos, currentPos);
  };

  const drawTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !e.touches[0]) return;

    const rect = canvas.getBoundingClientRect();
    const currentPos = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };

    drawLine(ctx, lastPos, currentPos);
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (currentTool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 2;
    }

    ctx.stroke();
    setLastPos(to);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const analyzeDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL("image/png");
    onAnalyze(imageData);
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `balvis-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const toolButtonClass = (tool: "pen" | "eraser") =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
      currentTool === tool
        ? "bg-[color:var(--accent)] text-white"
        : "bg-white/80 text-[color:var(--muted)] hover:bg-white hover:text-[color:var(--text)] dark:bg-black/10"
    }`;

  return (
    <div
      className={
        isModal
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          : "flex h-full w-full flex-col"
      }
    >
      <div
        className={
          isModal
            ? "flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] panel-surface"
            : "flex h-full w-full flex-col bg-transparent"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b soft-divider px-5 py-5 sm:px-6">
          <div>
            <p className="caption-label mb-2">Whiteboard</p>
            <h3 className="text-2xl font-semibold text-[color:var(--text)]">
              Sketch it out, then ask BALVIS to read it back with you
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              Use the canvas for equations, diagrams, rough notes, or concept
              maps. When you're ready, BALVIS can analyze what you drew.
            </p>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-white/70 text-[color:var(--muted)] transition hover:bg-white hover:text-[color:var(--text)] dark:bg-black/10"
              disabled={isAnalyzing}
              title="Close whiteboard"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-4 border-b soft-divider bg-[color:var(--surface)]/80 px-5 py-4 sm:grid-cols-[1.2fr_auto] sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 p-1 dark:bg-black/10">
              <button onClick={() => setCurrentTool("pen")} className={toolButtonClass("pen")}>
                <FiEdit3 className="h-4 w-4" />
                Pen
              </button>
              <button
                onClick={() => setCurrentTool("eraser")}
                className={toolButtonClass("eraser")}
              >
                <FiTrash2 className="h-4 w-4" />
                Erase
              </button>
            </div>

            <label className="inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-sm text-[color:var(--muted)] dark:bg-black/10">
              Stroke
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-[color:var(--accent)]"
              />
              <span className="min-w-[2.5rem] text-right font-semibold text-[color:var(--text)]">
                {brushSize}px
              </span>
            </label>

            {currentTool === "pen" && (
              <label className="inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-sm text-[color:var(--muted)] dark:bg-black/10">
                Ink
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="h-8 w-8 rounded-full border-0 bg-transparent"
                />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={clearCanvas}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              disabled={isAnalyzing}
            >
              <FiTrash2 className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={downloadDrawing}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-white/70 px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-white dark:bg-black/10"
              disabled={isAnalyzing}
            >
              <FiDownload className="h-4 w-4" />
              Save image
            </button>
            <button
              onClick={analyzeDrawing}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiZap className="h-4 w-4" />
              {isAnalyzing ? "Analyzing" : "Analyze board"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(248,244,236,0.55),rgba(234,223,207,0.52))] p-4 dark:bg-[linear-gradient(180deg,rgba(16,19,18,0.8),rgba(23,28,27,0.85))] sm:p-6">
          <div className="mx-auto h-full rounded-[28px] border border-[color:var(--surface-border)] bg-white p-3 shadow-[0_18px_38px_rgba(64,41,25,0.08)]">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="block h-auto w-full cursor-crosshair rounded-[22px]"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawingTouch}
              onTouchMove={drawTouch}
              onTouchEnd={stopDrawing}
              style={{ touchAction: "none" }}
            />
          </div>
        </div>

        <div className="border-t soft-divider bg-[color:var(--surface)]/80 px-5 py-4 sm:px-6">
          <div className="grid gap-4 text-sm text-[color:var(--muted)] md:grid-cols-3">
            <div>
              <p className="font-semibold text-[color:var(--text)]">Good for</p>
              <p className="mt-1 leading-6">
                Equations, worked examples, concept maps, and rough visual notes.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[color:var(--text)]">Try writing</p>
              <p className="mt-1 leading-6">
                A problem statement, a labeled diagram, or the steps you took to solve something.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[color:var(--text)]">Then ask for</p>
              <p className="mt-1 leading-6">
                A clearer explanation, study tips, related videos, or a cleaner next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
