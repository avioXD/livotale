import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar } from '@/app/layouts/AdminLayout';
import { AdminMobileSidebar } from '@/app/layouts/AdminMobileSidebar';
import { cn } from '@/utils';
import { useAuthStore } from '@/store';

export function AdminShell() {
  const collapsed = useAuthStore((state) => state.sidebarCollapsed);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={cn('hidden lg:block shrink-0', collapsed ? 'w-[72px]' : 'w-64')}>
        <Sidebar />
      </div>

      <AdminMobileSidebar open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMobileMenuOpen={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
