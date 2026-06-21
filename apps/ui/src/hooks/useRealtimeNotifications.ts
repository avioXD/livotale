import { useEffect, useRef } from 'react';
import { apiRoleForWs, WsClient } from '@/services/realtime/wsClient';
import { useUserRole } from '@/store';

export function useRealtimeNotifications(onUpdate: () => void) {
  const role = useUserRole();
  const clientRef = useRef<WsClient | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!role) return undefined;

    const client = new WsClient({
      path: '/ws/v1/notifications',
      query: { role: apiRoleForWs(role) },
      onMessage: () => onUpdateRef.current(),
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
  }, [role]);
}

export function useOrderRealtime(orderId: string | undefined, channel: 'operations' | 'technician', onUpdate: () => void) {
  const clientRef = useRef<WsClient | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!orderId) return undefined;

    const client = new WsClient({
      path: `/ws/v1/${channel}/orders/${orderId}`,
      onMessage: () => onUpdateRef.current(),
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [orderId, channel]);
}

export function usePatientPortalRealtime(phone: string | undefined, onUpdate: () => void) {
  const clientRef = useRef<WsClient | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!phone) return undefined;

    const client = new WsClient({
      path: '/ws/v1/patient-portal',
      query: { phone },
      tokenOptional: true,
      onMessage: () => onUpdateRef.current(),
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [phone]);
}
