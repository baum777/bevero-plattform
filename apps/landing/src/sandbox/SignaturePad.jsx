import React, { useRef, useState } from "react";

export function SignaturePad({ label, name, value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(value?.startsWith("data:image"));

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(rect.width, 1)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(rect.height, 1)),
    };
  }

  function start(event) {
    const context = canvasRef.current?.getContext?.("2d");
    if (!context) return;
    drawingRef.current = true;
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#0b4d2d";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext?.("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    setHasInk(true);
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      onChange(canvasRef.current.toDataURL("image/png"));
    } catch {
      onChange("");
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext?.("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange("");
  }

  return (
    <fieldset className="sandbox-signature">
      <legend>{label}</legend>
      <canvas
        ref={canvasRef}
        width="480"
        height="140"
        aria-label={`${label} zeichnen`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="sandbox-signature__actions">
        <button type="button" className="sandbox-button sandbox-button--quiet" onClick={clear}>
          Zeichnung löschen
        </button>
        <button
          type="button"
          className="sandbox-button sandbox-button--secondary"
          disabled={!name.trim()}
          onClick={() => onChange(`typed:${name.trim()}`)}
        >
          Name als Demo-Bestätigung verwenden
        </button>
      </div>
      {value ? <p className="sandbox-success">Bestätigung erfasst{hasInk ? " (gezeichnet)" : " (per Name)"}.</p> : null}
    </fieldset>
  );
}
