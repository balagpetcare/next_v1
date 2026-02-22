"use client";

import { createContext, useCallback, useMemo, useRef, useState } from "react";
import ToastViewport from "@/src/components/ToastViewport";

const DEFAULT_DURATION_MS = 4000;
const DEDUPE_MS = 2000;

export const TOAST_VARIANTS = ["success", "error", "warning", "info"];

export const ToastContext = createContext(null);

const VARIANT_CLASSES = {
  success: "alert-success",
  error: "alert-danger",
  warning: "alert-warning",
  info: "alert-info",
};

function ToastProviderInner({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastMessageRef = useRef({ message: null, at: 0 });

  const add = useCallback((variant, message, opts = {}) => {
    const duration = opts.duration ?? DEFAULT_DURATION_MS;
    const dedupe = opts.dedupe !== false;
    const now = Date.now();
    if (dedupe && typeof message === "string" && message === lastMessageRef.current.message && now - lastMessageRef.current.at < DEDUPE_MS) {
      return;
    }
    lastMessageRef.current = { message: typeof message === "string" ? message : "", at: now };
    const id = `${now}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, variant, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo(
    () => ({
      success: (msg, opts) => add("success", msg, opts),
      error: (msg, opts) => add("error", msg, opts),
      warning: (msg, opts) => add("warning", msg, opts),
      info: (msg, opts) => add("info", msg, opts),
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, remove }}>
      <ToastViewport toasts={toasts} remove={remove} variantClasses={VARIANT_CLASSES} />
      {children}
    </ToastContext.Provider>
  );
}

export function ToastProvider({ children }) {
  return <ToastProviderInner>{children}</ToastProviderInner>;
}
