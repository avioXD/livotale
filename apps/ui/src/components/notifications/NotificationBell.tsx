import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { inboxNotificationService } from '@/services/notifications/InboxNotificationService';
import { useUserRole } from '@/store';
import { orgPath } from '@/app/config/orgRoutes';

interface NotificationBellProps {
  /** Staff inbox link; patient portal passes `/patient/notifications` */
  inboxPath?: string;
  /** Patient portal phone override */
  patientPhone?: string;
}

export function NotificationBell({ inboxPath = orgPath('/notifications'), patientPhone }: NotificationBellProps) {
  const role = useUserRole();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const n = patientPhone
          ? await inboxNotificationService.unreadCountForPhone(patientPhone)
          : await inboxNotificationService.unreadCount(role);
        setCount(n);
      } catch {
        setCount(0);
      }
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [role, patientPhone]);

  const refreshCount = useCallback(async () => {
    try {
      const n = patientPhone
        ? await inboxNotificationService.unreadCountForPhone(patientPhone)
        : await inboxNotificationService.unreadCount(role);
      setCount(n);
    } catch {
      setCount(0);
    }
  }, [role, patientPhone]);

  useRealtimeNotifications(refreshCount);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to={inboxPath} aria-label={`Notifications${count ? `, ${count} unread` : ''}`}>
        <FiBell className="h-5 w-5" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
            {count > 9 ? '9+' : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
