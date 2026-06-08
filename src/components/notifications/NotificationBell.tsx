import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { inboxNotificationService } from '@/services/notifications/InboxNotificationService';
import { useUserRole } from '@/store';

interface NotificationBellProps {
  /** Staff inbox link; patient portal passes `/patient/notifications` */
  inboxPath?: string;
  /** Patient portal phone override */
  patientPhone?: string;
}

export function NotificationBell({ inboxPath = '/notifications', patientPhone }: NotificationBellProps) {
  const role = useUserRole();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const n = patientPhone
        ? await inboxNotificationService.unreadCountForPhone(patientPhone)
        : await inboxNotificationService.unreadCount(role);
      setCount(n);
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [role, patientPhone]);

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
