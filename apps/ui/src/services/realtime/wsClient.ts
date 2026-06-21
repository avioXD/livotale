/**
 * WebSocket client for Livotale realtime channels.
 */
import { getStoredToken } from '@/rbac';
import { resolveWsOrigin } from '@/utils/resolveWsOrigin';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';

function wsBaseUrl(): string {
  return resolveWsOrigin(API_BASE);
}

export type WsMessageHandler = (payload: unknown) => void;

export interface WsClientOptions {
  path: string;
  query?: Record<string, string>;
  onMessage?: WsMessageHandler;
  onOpen?: () => void;
  onClose?: () => void;
  /** Patient portal demo mode may connect without JWT */
  tokenOptional?: boolean;
}

export class WsClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closed = false;

  constructor(private readonly options: WsClientOptions) {}

  connect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closed = false;
    const params = new URLSearchParams(this.options.query ?? {});
    const token = getStoredToken();
    if (token) {
      params.set('token', token);
    } else if (!this.options.tokenOptional) {
      return;
    }
    const qs = params.toString();
    const url = `${wsBaseUrl()}${this.options.path}${qs ? `?${qs}` : ''}`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        socket.close();
        return;
      }
      this.options.onOpen?.();
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      try {
        const payload = JSON.parse(String(event.data)) as unknown;
        this.options.onMessage?.(payload);
      } catch {
        this.options.onMessage?.(event.data);
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.options.onClose?.();
      if (!this.closed) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 5000);
      }
    };
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;

    if (socket.readyState === WebSocket.CONNECTING) {
      // Closing while CONNECTING triggers a noisy browser warning; close after open instead.
      socket.addEventListener('open', () => socket.close(), { once: true });
      return;
    }

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
      socket.close();
    }
  }
}

export function apiRoleForWs(appRole: string | undefined): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'admin',
    CITY_MANAGER: 'city_manager',
    OPERATIONS: 'support',
    TECHNICIAN: 'technician',
    DOCTOR: 'doctor',
    PATIENT: 'patient',
  };
  return map[appRole ?? ''] ?? 'support';
}
