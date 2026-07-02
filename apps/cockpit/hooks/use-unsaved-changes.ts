"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useUnsavedChanges(isDirty: boolean) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const guardAction = useCallback((action: () => void) => {
    if (!isDirtyRef.current) {
      action();
      return;
    }
    pendingAction.current = action;
    setShowDiscardDialog(true);
  }, []);

  const confirmDiscard = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setShowDiscardDialog(false);
    action?.();
  }, []);

  const cancelDiscard = useCallback(() => {
    pendingAction.current = null;
    setShowDiscardDialog(false);
  }, []);

  return { showDiscardDialog, guardAction, confirmDiscard, cancelDiscard };
}
