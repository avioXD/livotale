import { Link, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMenu } from 'react-icons/fi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getNavGroupsForRole } from '@/app/config/navigation';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuthStore, useUserRole } from '@/store';
import { cn, getInitialsFromFullName } from '@/utils';
import { ROLE_LABELS } from '@/rbac';
import { APP_NAME } from '@/utils/constants';
import type { NavChildItem, NavItem } from '@/types';

function isNavPathActive(pathname: string, search: string, path: string): boolean {
  const [basePath, query = ''] = path.split('?');

  if (query) {
    const expected = new URLSearchParams(query);
    const actual = new URLSearchParams(search);
    for (const [key, value] of expected) {
      if (actual.get(key) !== value) return false;
    }
    return pathname === basePath;
  }

  if (basePath === '/admin/operations') {
    return pathname === '/admin/operations' && !search.includes('tab=');
  }

  if (basePath === '/doctor/appointments') {
    return pathname === '/doctor/appointments' && !search.includes('section=');
  }

  if (basePath === '/settings') {
    const tab = new URLSearchParams(search).get('tab');
    if (query) {
      const expectedTab = new URLSearchParams(query).get('tab');
      return pathname === '/settings' && tab === expectedTab;
    }
    return pathname === '/settings' && (!tab || tab === 'profile');
  }

  if (basePath.startsWith('/admin/staff/')) {
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  }

  return pathname === basePath || (pathname.startsWith(`${basePath}/`) && basePath !== '/admin/operations');
}

function isNavItemActive(pathname: string, search: string, item: NavItem): boolean {
  if (item.children?.length) {
    const childActive = item.children.some((child) => isChildActive(pathname, search, child));
    if (item.childrenOnly) return childActive;
    return childActive || isNavPathActive(pathname, search, item.path);
  }
  return isNavPathActive(pathname, search, item.path);
}

function isChildActive(pathname: string, search: string, child: NavChildItem): boolean {
  if (isNavPathActive(pathname, search, child.path)) return true;
  if (child.id === 'ops-appointments') {
    return pathname.startsWith('/admin/appointments/');
  }
  if (child.id === 'ops-samples' && pathname === '/admin/sample-collections') {
    return true;
  }
  if (child.id === 'care-appointments') {
    return pathname === '/appointments' || (pathname.startsWith('/appointments/') && !pathname.includes('/book'));
  }
  if (child.id === 'care-patients') {
    return pathname === '/patients' || pathname.startsWith('/patients/');
  }
  if (child.id === 'ops-enquiries') {
    return (
      (pathname === '/admin/operations' && search.includes('tab=enquiries')) ||
      pathname === '/admin/enquiries' ||
      pathname.startsWith('/admin/enquiries/')
    );
  }
  if (child.id === 'doc-availability') {
    return pathname === '/settings' && search.includes('tab=availability');
  }
  if (child.id === 'doc-leave') {
    return pathname === '/settings' && search.includes('tab=leave');
  }
  if (child.id === 'settings-profile') {
    return pathname === '/settings' && !search.includes('tab=');
  }
  if (child.id === 'tech-orders') {
    return pathname === '/technician/orders' || pathname.startsWith('/technician/orders/');
  }
  return false;
}

export function Sidebar() {
  const location = useLocation();
  const userRole = useUserRole();
  const user = useAuthStore((state) => state.user);
  const collapsed = useAuthStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAuthStore((state) => state.toggleSidebar);
  const logout = useAuthStore((state) => state.logout);

  const navGroups = getNavGroupsForRole(userRole);

  const renderChildLink = (child: NavChildItem) => {
    const ChildIcon = child.icon;
    const isActive = isChildActive(location.pathname, location.search, child);
    return (
      <Link
        key={child.id}
        to={child.path}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <ChildIcon className={cn('h-5 w-5 shrink-0', isActive && 'text-livotale-pink')} />
        <span className="truncate">{child.label}</span>
      </Link>
    );
  };

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isNavItemActive(location.pathname, location.search, item);
    const hasChildren = Boolean(item.children?.length);

    if (hasChildren && item.childrenOnly && !collapsed) {
      return (
        <div key={item.id} className="space-y-0.5">
          {item.children!.map((child) => renderChildLink(child))}
        </div>
      );
    }

    if (hasChildren && !collapsed) {
      return (
        <div key={item.id} className="space-y-0.5">
          <Link
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-livotale-pink')} />
            <span className="truncate">{item.label}</span>
          </Link>
          <div className="ml-3 border-l border-border/60 pl-1">
            {item.children!.map((child) => renderChildLink(child))}
          </div>
        </div>
      );
    }

    const linkContent = (
      <Link
        to={item.path}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-livotale-pink')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (collapsed && hasChildren) {
      const tooltipLabel = item.childrenOnly
        ? navGroups.find((g) => g.items.includes(item))?.label ?? item.label
        : item.label;
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            {item.childrenOnly ? (
              <div
                className={cn(
                  'flex items-center justify-center rounded-lg px-2 py-2.5',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-livotale-pink')} />
              </div>
            ) : (
              linkContent
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className="space-y-1 p-2">
            <p className="px-2 pb-1 text-xs font-semibold">{tooltipLabel}</p>
            {item.children!.map((child) => (
              <Link
                key={child.id}
                to={child.path}
                className="block rounded px-2 py-1 text-sm hover:bg-accent"
              >
                {child.label}
              </Link>
            ))}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (collapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{linkContent}</div>;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-card transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <img
            src="/assets/livotale-logo.png"
            alt={`${APP_NAME} logo`}
            className="h-9 w-9 shrink-0 object-contain"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-livotale-pink">{APP_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">Liver Care Admin</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {!collapsed && navGroups.length > 1 && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => renderNavLink(item))}
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          {user && (
            <div
              className={cn(
                'mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-2',
                collapsed && 'justify-center',
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-livotale-teal text-white text-xs">
                  {getInitialsFromFullName(user.fullName)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className={cn('flex gap-2', collapsed ? 'flex-col' : 'flex-row')}>
            <Button
              variant="outline"
              size={collapsed ? 'icon' : 'default'}
              className={cn(!collapsed && 'flex-1')}
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
              {!collapsed && 'Collapse'}
            </Button>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={() => void logout()}
              aria-label="Logout"
            >
              <FiLogOut />
              {!collapsed && 'Logout'}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function TopBar() {
  const toggleSidebar = useAuthStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FiMenu className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <div>
          <h1 className="text-lg font-semibold">
            Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Liver care ecosystem — Liver Fibrosis Scan, AI plans & home delivery
          </p>
        </div>
      </div>
      <img
        src="/assets/livotale-logo.png"
        alt="Livotale"
        className="h-8 w-8 object-contain lg:hidden"
      />
    </header>
  );
}
