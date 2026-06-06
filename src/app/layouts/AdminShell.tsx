import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar } from '@/app/layouts/AdminLayout';
import { cn } from '@/utils';
import { useAuthStore } from '@/store';

export function AdminShell() {
  const collapsed = useAuthStore((state) => state.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={cn('hidden lg:block shrink-0', collapsed ? 'w-[72px]' : 'w-64')}>
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
