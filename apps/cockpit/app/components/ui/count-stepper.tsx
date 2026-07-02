"use client";

type CountStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  label?: string;
};

export function CountStepper({ value, onChange, min = 0, label }: CountStepperProps) {
  function decrement() {
    if (value > min) onChange(value - 1);
  }

  function increment() {
    onChange(value + 1);
  }

  return (
    <div className="count-stepper" role="group" aria-label={label ?? "Menge"}>
      <button
        aria-label="Verringern"
        className="count-stepper__btn"
        disabled={value <= min}
        onClick={decrement}
        type="button"
      >
        −
      </button>
      <input
        aria-label={label ?? "Menge"}
        className="count-stepper__input"
        inputMode="numeric"
        min={min}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (!isNaN(parsed) && parsed >= min) onChange(parsed);
        }}
        type="number"
        value={value}
      />
      <button
        aria-label="Erhöhen"
        className="count-stepper__btn"
        onClick={increment}
        type="button"
      >
        +
      </button>
    </div>
  );
}
