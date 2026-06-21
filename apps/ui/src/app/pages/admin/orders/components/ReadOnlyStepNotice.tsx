import { FiLock } from 'react-icons/fi';

export function ReadOnlyStepNotice() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50/80 px-3 py-2 text-xs text-green-900">
      <FiLock className="h-3.5 w-3.5 shrink-0" />
      <span>Completed step — view only. You can review data and download files; changes are disabled.</span>
    </div>
  );
}
