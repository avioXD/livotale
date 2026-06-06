import { FiFilter, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onApplyFilters,
  onResetFilters,
  isLoading,
  children,
}: ListToolbarProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10"
            aria-label="Search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" onClick={onApplyFilters} disabled={isLoading}>
            <FiFilter className="h-4 w-4" />
            Apply Filters
          </Button>
          <Button type="button" variant="outline" onClick={onResetFilters} disabled={isLoading}>
            <FiRefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {children && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}

export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
