import { Link } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PATIENT_PORTAL_SECONDARY_NAV } from '@/app/config/patientPortalNav';
import { cn } from '@/utils';

interface PatientPortalMobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onLogout: () => void;
}

export function PatientPortalMobileMenu({
  open,
  onOpenChange,
  patientName,
  onLogout,
}: PatientPortalMobileMenuProps) {
  const menuItems = PATIENT_PORTAL_SECONDARY_NAV.filter((item) => item.id !== 'logout');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(100vw-2rem,280px)] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="text-base">Menu</SheetTitle>
          <p className="text-sm text-muted-foreground">{patientName}</p>
        </SheetHeader>
        <nav className="flex flex-col p-3" aria-label="Secondary navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const className = cn(
              'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            );
            if (item.external) {
              return (
                <a key={item.id} href={item.to} className={className} onClick={() => onOpenChange(false)}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            }
            return (
              <Link key={item.id} to={item.to} className={className} onClick={() => onOpenChange(false)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Separator className="my-3" />
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => {
              onOpenChange(false);
              onLogout();
            }}
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
