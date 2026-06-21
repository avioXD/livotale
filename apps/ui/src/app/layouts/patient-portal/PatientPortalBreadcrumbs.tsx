import { Link, useLocation, useParams } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { cn } from '@/utils';

interface Crumb {
  label: string;
  to?: string;
}

function buildCrumbs(pathname: string, orderId?: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Dashboard', to: '/patient' }];

  if (pathname.startsWith('/patient/orders')) {
    crumbs.push({ label: 'Orders', to: '/patient/orders' });
  }

  if (pathname.startsWith('/patient/enquiries/')) {
    crumbs.push({ label: 'Orders', to: '/patient/orders#enquiries' });
    crumbs.push({ label: 'Enquiry' });
  }

  if (orderId && pathname.includes(`/patient/orders/${orderId}`)) {
    crumbs.push({ label: 'Order', to: `/patient/orders/${orderId}` });
  }

  if (pathname.endsWith('/pay')) {
    crumbs.push({ label: 'Payment' });
  } else if (pathname.endsWith('/report')) {
    crumbs.push({ label: 'Report' });
  } else if (pathname.endsWith('/prescription')) {
    crumbs.push({ label: 'Prescription' });
  } else if (pathname === '/patient/profile') {
    crumbs.push({ label: 'Profile' });
  } else if (pathname === '/patient/notifications') {
    crumbs.push({ label: 'Notifications' });
  } else if (pathname === '/patient/downloads') {
    crumbs.push({ label: 'Downloads' });
  }

  if (crumbs.length === 1 && pathname === '/patient') {
    return [{ label: 'Dashboard' }];
  }

  return crumbs;
}

export function PatientPortalBreadcrumbs({ orderNumber }: { orderNumber?: string }) {
  const { pathname } = useLocation();
  const { id: orderId } = useParams<{ id: string }>();
  const crumbs = buildCrumbs(pathname, orderId);

  if (orderNumber && crumbs.some((c) => c.label === 'Order')) {
    const idx = crumbs.findIndex((c) => c.label === 'Order');
    if (idx >= 0) crumbs[idx] = { ...crumbs[idx], label: orderNumber };
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <FiChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            {crumb.to && i < crumbs.length - 1 ? (
              <Link to={crumb.to} className="truncate hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn('truncate', i === crumbs.length - 1 && 'font-medium text-foreground')}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
