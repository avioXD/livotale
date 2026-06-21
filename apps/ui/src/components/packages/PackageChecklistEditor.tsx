import type { PackageWorkflowFlags } from '@/services/liverCare/package.utils';
import {
  SECTION_CONSULT,
  SECTION_PATHOLOGY,
  SECTION_SCAN,
  defaultChecklistSections,
} from '@/services/liverCare/package.utils';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SECTION_FLAG: Record<string, keyof PackageWorkflowFlags> = {
  [SECTION_SCAN]: 'fibrosisScanIncluded',
  [SECTION_PATHOLOGY]: 'pathologyIncluded',
  [SECTION_CONSULT]: 'consultationIncluded',
};

interface PackageChecklistEditorProps {
  fibrosisScanIncluded: boolean;
  pathologyIncluded: boolean;
  consultationIncluded: boolean;
  onFlagsChange: (flags: PackageWorkflowFlags) => void;
}

export function PackageChecklistEditor({
  fibrosisScanIncluded,
  pathologyIncluded,
  consultationIncluded,
  onFlagsChange,
}: PackageChecklistEditorProps) {
  const flags: PackageWorkflowFlags = {
    fibrosisScanIncluded,
    pathologyIncluded,
    consultationIncluded,
  };
  const sections = defaultChecklistSections(flags);

  const toggleSection = (sectionId: string, included: boolean) => {
    const flag = SECTION_FLAG[sectionId];
    if (!flag) return;
    onFlagsChange({ ...flags, [flag]: included });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>What&apos;s included</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which modules are part of this package. Section contents are fixed — check or uncheck to define the
          package and order workflow.
        </p>
      </div>

      {sections.map((section) => {
        const flag = SECTION_FLAG[section.id];
        const included = flag ? flags[flag] : false;

        return (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
              <label className="flex items-center gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={(e) => toggleSection(section.id, e.target.checked)}
                />
                Include in package
              </label>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    item.included ? 'border-border' : 'border-dashed bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span className="pt-0.5 shrink-0" aria-hidden>
                    {item.included ? '✓' : '—'}
                  </span>
                  <span className={item.included ? '' : 'line-through'}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-dashed bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Reports &amp; delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="text-xs">Always included in every package.</p>
          <ul className="space-y-1">
            <li>• LivoTale letterhead final report</li>
            <li>• Patient portal download</li>
            <li>• WhatsApp report notification</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
