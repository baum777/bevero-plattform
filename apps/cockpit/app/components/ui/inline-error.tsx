type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function InlineError({ message, onRetry, retryLabel = "Erneut versuchen" }: InlineErrorProps) {
  return (
    <p aria-live="assertive" className="inline-error" role="alert">
      <span className="inline-error__icon" aria-hidden="true">⚠</span>
      {message}
      {onRetry ? (
        <button className="inline-error__retry" onClick={onRetry} type="button">
          {retryLabel}
        </button>
      ) : null}
    </p>
  );
}
