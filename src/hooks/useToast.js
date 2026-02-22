"use client";

import { useContext } from "react";
import { ToastContext } from "@/src/context/ToastContext";

const noop = () => {};
const fallbackToast = { success: noop, error: noop, warning: noop, info: noop };

/**
 * Global toast notifications. Use in any client component under the app.
 * @returns {{ success: (message: string, opts?: { duration?: number, dedupe?: boolean }) => void, error: (...), warning: (...), info: (...) }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? fallbackToast;
}
