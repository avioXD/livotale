import { Link, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMenu } from 'react-icons/fi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getNavItemsForRole } from '@/app/config/navigation';
import { useAuthStore, useUserRole } from '@/store';
import { cn, getInitials } from '@/utils';
import { ROLE_LABELS } from '@/rbac';
import { APP_NAME } from '@/utils/constants';

export function Sidebar() {
  const location = useLocation();
  const userRole = useUserRole();
  const user = useAuthStore((state) => state.user);
  const collapsed = useAuthStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAuthStore((state) => state.toggleSidebar);
  const logout = useAuthStore((state) => state.logout);

  const navItems = getNavItemsForRole(userRole);

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
              <p className="truncate text-sm font-bold text-livotel-pink">{APP_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">Liver Care Admin</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

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
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-livotel-pink')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.id}>{linkContent}</div>;
          })}
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
                <AvatarFallback className="bg-livotel-teal text-white text-xs">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
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
        <div>
          <h1 className="text-lg font-semibold">Welcome back{user ? `, ${user.firstName}` : ''}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Liver care ecosystem — FibroScan, AI plans & home delivery
          </p>
        </div>
      </div>
      <img
        src="/assets/livotale-logo.png"
        alt="Livotel"
        className="h-8 w-8 object-contain lg:hidden"
      />
    </header>
  );
}
