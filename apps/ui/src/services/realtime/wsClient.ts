/**
 * WebSocket client for Livotale realtime channels.
 */
import { getStoredToken } from '@/rbac';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';

function wsBaseUrl(): string {
  const url = new URL(API_BASE);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
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
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.options.onOpen?.();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as unknown;
        this.options.onMessage?.(payload);
      } catch {
        this.options.onMessage?.(event.data);
      }
    };

    this.socket.onclose = () => {
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
    this.socket?.close();
    this.socket = null;
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
