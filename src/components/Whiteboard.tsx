import React, { useRef, useState, useEffect } from "react";

interface WhiteboardProps {
  onAnalyze: (imageData: string) => void;
  onClose?: () => void; // Optional, only used for modal mode
  isAnalyzing: boolean;
  isModal?: boolean; // Add prop to determine if it's a modal or tab
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  onAnalyze,
  onClose,
  isAnalyzing,
  isModal = false, // Default to tab mode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"pen" | "eraser">("pen");
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#000000");
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set initial canvas properties
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

  return (
    <div
      className={
        isModal
          ? "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          : "flex flex-col h-full w-full"
      }
    >
      <div
        className={
          isModal
            ? "bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
            : "bg-white h-full w-full flex flex-col"
        }
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h3 className="text-xl font-bold text-gray-800">
              BALVIS Whiteboard
            </h3>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 
                       rounded-lg p-2.5 transition-all duration-200 hover:scale-105 
                       border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                       shadow-sm hover:shadow-md active:scale-95 min-w-[44px] min-h-[44px]
                       flex items-center justify-center"
              disabled={isAnalyzing}
              title="Close whiteboard"
            >
              <span className="text-xl font-bold leading-none text-gray-700 dark:text-gray-300">
                ×
              </span>
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          {/* Drawing Tools */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Tool:</label>
              <button
                onClick={() => setCurrentTool("pen")}
                className={`px-3 py-1 rounded text-sm ${
                  currentTool === "pen"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ✏️ Pen
              </button>
              <button
                onClick={() => setCurrentTool("eraser")}
                className={`px-3 py-1 rounded text-sm ${
                  currentTool === "eraser"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🧽 Eraser
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600 w-8">{brushSize}px</span>
            </div>

            {currentTool === "pen" && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Color:
                </label>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearCanvas}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
              disabled={isAnalyzing}
            >
              🗑️ Clear
            </button>
            <button
              onClick={downloadDrawing}
              className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
              disabled={isAnalyzing}
            >
              💾 Save
            </button>
            <button
              onClick={analyzeDrawing}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isAnalyzing ? "🔄 Analyzing..." : "🤖 Analyze with BALVIS"}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-4 bg-gray-100 overflow-auto">
          <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="block cursor-crosshair"
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

        {/* Instructions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">
              💡 What can you draw for BALVIS to analyze:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>📐 Math:</strong> Equations, graphs, geometric shapes
              </div>
              <div>
                <strong>🔬 Science:</strong> Diagrams, molecular structures,
                circuits
              </div>
              <div>
                <strong>📚 Study:</strong> Mind maps, flowcharts, concept
                diagrams
              </div>
              <div>
                <strong>✍️ Notes:</strong> Handwritten text, sketches,
                annotations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
