"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const API_BASE =
  typeof window !== "undefined"
    ? (window.location.origin || String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3100").replace(/\/+$/, ""))
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

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

export type DoctorSocketStatus = "connected" | "reconnecting" | "offline";

export function useDoctorSocket(opts: {
  onQueueUpdate?: () => void;
  onNotification?: (payload: any) => void;
  onAppointmentUpdate?: (payload: any) => void;
  onLabReady?: (payload: any) => void;
  enabled?: boolean;
}) {
  const { onQueueUpdate, onNotification, onAppointmentUpdate, onLabReady, enabled = true } = opts;
  const [status, setStatus] = useState<DoctorSocketStatus>("offline");
  const socketRef = useRef<Socket | null>(null);
  const onRefreshRef = useRef(onQueueUpdate);
  const onNotificationRef = useRef(onNotification);
  const onAppointmentUpdateRef = useRef(onAppointmentUpdate);
  const onLabReadyRef = useRef(onLabReady);
  onRefreshRef.current = onQueueUpdate;
  onNotificationRef.current = onNotification;
  onAppointmentUpdateRef.current = onAppointmentUpdate;
  onLabReadyRef.current = onLabReady;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setStatus("offline");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setStatus("offline");
      return;
    }

    const socket = io(API_BASE, {
      path: "/api/v1/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") setStatus("offline");
      else setStatus("reconnecting");
    });
    socket.on("connect_error", () => setStatus("reconnecting"));
    socket.on("DOCTOR_QUEUE_UPDATED", () => {
      onRefreshRef.current?.();
    });
    socket.on("DOCTOR_NOTIFICATION", (payload) => {
      onNotificationRef.current?.(payload);
    });
    socket.on("DOCTOR_APPOINTMENT_UPDATED", (payload) => {
      onAppointmentUpdateRef.current?.(payload);
    });
    socket.on("DOCTOR_LAB_READY", (payload) => {
      onLabReadyRef.current?.(payload);
    });

    return () => {
      socket.off("DOCTOR_QUEUE_UPDATED");
      socket.off("DOCTOR_NOTIFICATION");
      socket.off("DOCTOR_APPOINTMENT_UPDATED");
      socket.off("DOCTOR_LAB_READY");
      socket.close();
      socketRef.current = null;
      setStatus("offline");
    };
  }, [enabled]);

  return { status, connected: status === "connected" };
}
