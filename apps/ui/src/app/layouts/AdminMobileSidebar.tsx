import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from '@/app/layouts/AdminLayout';

interface AdminMobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminMobileSidebar({ open, onOpenChange }: AdminMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(100vw-2rem,280px)] p-0">
        <Sidebar variant="drawer" onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
