"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiGet, apiPost } from "./api";
import { io, Socket } from "socket.io-client";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const WS_BASE = API_BASE.replace(/^http/, "ws");
const COUNT_POLL_MS = 15000;
const LIST_POLL_MS = 30000;

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, unknown> | null;
  priority?: string;
  status?: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  severity?: string | null;
  source?: string | null;
  orgId?: number | null;
  branchId?: number | null;
  sender?: { id: number; profile?: { displayName?: string } } | null;
};

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const fromCookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("access_token="))
    ?.split("=")[1]
    ?.trim();
  if (fromCookie) return fromCookie;
  return localStorage.getItem("bpa_access_token") || localStorage.getItem("access_token");
}

function playNotificationSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

export type NotificationPanel = "owner" | "admin" | "branch" | "staff";

export type UseNotificationsOptions = {
  enabled?: boolean;
  soundEnabled?: boolean;
  /** panel: scope so branch manager does not see owner notifications (owner|admin|branch|staff) */
  panel?: NotificationPanel | null;
  onNewNotification?: (item: NotificationItem) => void;
};

export function useNotifications(opts?: UseNotificationsOptions) {
  const enabled = opts?.enabled !== false;
  const soundEnabled = opts?.soundEnabled ?? true;
  const panel = opts?.panel ?? null;
  const onNewNotification = opts?.onNewNotification;
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const onInteraction = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener("click", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });
    return () => {
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, []);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const q = new URLSearchParams();
      if (panel) q.set("panel", panel);
      const url = q.toString() ? `/api/v1/notifications/unread-count?${q.toString()}` : "/api/v1/notifications/unread-count";
      const res = await apiGet<{ success: boolean; data: { count: number } }>(url);
      if (res?.success && typeof res?.data?.count === "number") setCount(res.data.count);
    } catch {
      // ignore
    }
  }, [enabled, panel]);

  const fetchList = useCallback(async (limit = 20, cursor?: string, scope = "dropdown") => {
    if (!enabled) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: String(limit), scope });
      if (cursor) q.set("cursor", cursor);
      if (panel) q.set("panel", panel);
      const res = await apiGet<{ success: boolean; data: { items: NotificationItem[]; nextCursor?: string | null } }>(
        `/api/v1/notifications?${q.toString()}`
      );
      if (res?.success && Array.isArray(res?.data?.items)) setItems(res.data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, panel]);

  const markRead = useCallback(async (id: number) => {
    try {
      await apiPost(`/api/v1/notifications/${id}/read`, {});
      setCount((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      // ignore
    }
  }, []);

  const readAll = useCallback(async () => {
    try {
      await apiPost("/api/v1/notifications/read-all", {});
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchCount();
    fetchList(20);
  }, [enabled, fetchCount, fetchList]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(fetchCount, COUNT_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, fetchCount]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => fetchList(10), LIST_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, fetchList]);

  // Socket.IO with fallback to WebSocket
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const token = getAuthToken();
    if (!token) return;

    const handleNewNotification = (payload: { notification?: NotificationItem }) => {
      const n = payload?.notification;
      if (n && n.id) {
        setCount((c) => c + 1);
        setItems((prev) => {
          if (prev.some((x) => x.id === n.id)) return prev;
          return [{ ...n, createdAt: n.createdAt || new Date().toISOString() }, ...prev];
        });
        onNewNotification?.(n);
        if (soundEnabled && userInteractedRef.current && !window.location.pathname?.includes("/notifications")) {
          playNotificationSound();
        }
      } else {
        fetchCount();
        fetchList(20);
      }
    };

    const handleUnreadCount = (payload: { count?: number }) => {
      if (typeof payload?.count === "number") setCount(payload.count);
    };

    try {
      const socket = io(API_BASE, {
        path: "/api/v1/socket.io",
        auth: { token },
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;
      socket.on("connect", () => setWsConnected(true));
      socket.on("disconnect", () => setWsConnected(false));
      socket.on("notification:new", handleNewNotification);
      socket.on("unread:count", handleUnreadCount);
      return () => {
        socket.off("notification:new", handleNewNotification);
        socket.off("unread:count", handleUnreadCount);
        socket.close();
        socketRef.current = null;
        setWsConnected(false);
      };
    } catch {
      // Fallback to legacy WebSocket
      const url = `${WS_BASE}/api/v1/realtime`;
      const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg?.event === "notification:new") {
            fetchCount();
            fetchList(20);
          }
        } catch {
          // ignore
        }
      };
      return () => {
        ws.close();
        wsRef.current = null;
        setWsConnected(false);
      };
    }
  }, [enabled, fetchCount, fetchList, soundEnabled, onNewNotification]);

  return {
    count,
    items,
    loading,
    wsConnected,
    fetchCount,
    fetchList,
    markRead,
    readAll,
  };
}
