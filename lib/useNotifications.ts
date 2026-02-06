"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiGet, apiPost } from "./api";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const WS_BASE = API_BASE.replace(/^http/, "ws");
const FALLBACK_POLL_MS = 30000;

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
};

export function useNotifications(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled !== false;
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await apiGet<{ success: boolean; data: { count: number } }>(
        "/api/v1/notifications/unread-count"
      );
      if (res?.success && typeof res?.data?.count === "number") setCount(res.data.count);
    } catch {
      // ignore
    }
  }, [enabled]);

  const fetchList = useCallback(async (limit = 20, cursor?: string) => {
    if (!enabled) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: String(limit) });
      if (cursor) q.set("cursor", cursor);
      const res = await apiGet<{ success: boolean; data: { items: NotificationItem[]; nextCursor?: string | null } }>(
        `/api/v1/notifications?${q.toString()}`
      );
      if (res?.success && Array.isArray(res?.data?.items)) setItems(res.data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

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
    pollRef.current = setInterval(fetchCount, FALLBACK_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [enabled, fetchCount]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const url = `${WS_BASE}/api/v1/realtime`;
    const token = typeof document !== "undefined" && document.cookie
      ? document.cookie.split(";").find((c) => c.trim().startsWith("access_token="))?.split("=")[1]?.trim()
      : null;
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    const ws = new WebSocket(wsUrl);
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
  }, [enabled, fetchCount, fetchList]);

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
