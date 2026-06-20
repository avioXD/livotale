import { useEffect, useRef } from 'react';
import { apiRoleForWs, WsClient } from '@/services/realtime/wsClient';
import { useUserRole } from '@/store';

export function useRealtimeNotifications(onUpdate: () => void) {
  const role = useUserRole();
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    if (!role) return undefined;

    const client = new WsClient({
      path: '/ws/v1/notifications',
      query: { role: apiRoleForWs(role) },
      onMessage: () => onUpdate(),
      onClose: () => {
        /* fallback polling handled by caller */
      },
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [role, onUpdate]);
}

export function useOrderRealtime(orderId: string | undefined, channel: 'operations' | 'technician', onUpdate: () => void) {
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    if (!orderId) return undefined;

    const client = new WsClient({
      path: `/ws/v1/${channel}/orders/${orderId}`,
      onMessage: () => onUpdate(),
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [orderId, channel, onUpdate]);
}

export function usePatientPortalRealtime(phone: string | undefined, onUpdate: () => void) {
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    if (!phone) return undefined;

    const client = new WsClient({
      path: '/ws/v1/patient-portal',
      query: { phone },
      tokenOptional: true,
      onMessage: () => onUpdate(),
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [phone, onUpdate]);
}
