import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { SignaturePad } from "../../src/sandbox/SignaturePad.jsx";

afterEach(() => vi.restoreAllMocks());

test("captures a pointer signature and can clear it", () => {
  const context = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,demo");
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, width: 480, height: 140, right: 480, bottom: 140,
  });
  const onChange = vi.fn();
  render(<SignaturePad label="Abgebende Schicht" name="Mara König" value="" onChange={onChange} />);
  const canvas = screen.getByLabelText("Abgebende Schicht zeichnen");

  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
  expect(context.stroke).toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledWith("data:image/png;base64,demo");

  fireEvent.click(screen.getByRole("button", { name: "Zeichnung löschen" }));
  expect(context.clearRect).toHaveBeenCalledWith(0, 0, 480, 140);
  expect(onChange).toHaveBeenLastCalledWith("");
});

test("uses the typed name as an accessible confirmation", () => {
  const onChange = vi.fn();
  render(<SignaturePad label="Übernehmende Schicht" name="Jonas Becker" value="" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Name als Demo-Bestätigung verwenden" }));
  expect(onChange).toHaveBeenCalledWith("typed:Jonas Becker");
});
