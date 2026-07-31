import { useEffect, useRef, useCallback } from "react";
import { getAuthToken } from "../utils/api";

export type WsIncomingMsg =
  | { type: "connected"; username: string; role: string }
  | { type: "new_message"; ticketId: string; message: any; newStatus: string }
  | { type: "ticket_updated"; ticketId: string; username: string; newStatus: string }
  | { type: "new_ticket"; ticket: any };

interface UseTicketSocketOptions {
  // نقش کاربر — ادمین همه تیکت‌ها رو watch می‌کنه
  role: "user" | "admin";
  // تیکتی که الان باز هست (فقط برای کاربر عادی)
  activeTicketId?: string | null;
  // callback که با هر پیام WebSocket صدا زده می‌شه
  onMessage: (msg: WsIncomingMsg) => void;
}

export function useTicketSocket({ role, activeTicketId, onMessage }: UseTicketSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage; // همیشه آخرین نسخه callback رو داریم

  const sendWatch = useCallback((ticketId: string | null) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (role === "admin") {
      ws.send(JSON.stringify({ type: "watch_all" }));
    } else if (ticketId) {
      ws.send(JSON.stringify({ type: "watch_ticket", ticketId }));
    }
  }, [role]);

  useEffect(() => {
    const token = getAuthToken();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}?token=${token || ""}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // بعد از اتصال بلافاصله بگو چی watch کنی
      if (role === "admin") {
        ws.send(JSON.stringify({ type: "watch_all" }));
      } else if (activeTicketId) {
        ws.send(JSON.stringify({ type: "watch_ticket", ticketId: activeTicketId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsIncomingMsg;
        onMessageRef.current(msg);
      } catch {}
    };

    ws.onerror = (err) => console.error("[WS] خطا:", err);
    ws.onclose = () => console.log("[WS] اتصال قطع شد");

    return () => {
      ws.close();
      wsRef.current = null;
    };
    // فقط یه بار mount می‌شه
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // وقتی تیکت فعال عوض می‌شه، به سرور بگو
  useEffect(() => {
    sendWatch(activeTicketId || null);
  }, [activeTicketId, sendWatch]);
}
