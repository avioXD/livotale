import { PackageChecklistEditor } from '@/components/packages/PackageChecklistEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { syncPackageFromFlags, type CreatePackageDraft } from '@/services/liverCare/package.utils';
import type { PackageFaq, PackageHighlight } from '@/types/package';

function linesToArray(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function arrayToLines(arr: string[]): string {
  return arr.join('\n');
}

interface PackageFormPanelProps {
  draft: CreatePackageDraft;
  onChange: (patch: Partial<CreatePackageDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  isCreate?: boolean;
}

export function PackageFormPanel({
  draft,
  onChange,
  onSave,
  onCancel,
  saving = false,
  isCreate = false,
}: PackageFormPanelProps) {
  const patchDraft = onChange;

  const onWorkflowFlagsChange = (flags: {
    fibrosisScanIncluded: boolean;
    pathologyIncluded: boolean;
    consultationIncluded: boolean;
  }) => {
    patchDraft(syncPackageFromFlags(flags));
  };

  const updateHighlights = (highlights: PackageHighlight[]) => patchDraft({ highlights });
  const updateFaqs = (faqs: PackageFaq[]) => patchDraft({ faqs });

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Basics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={draft.code} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input type="number" value={draft.sortOrder} onChange={(e) => patchDraft({ sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Subtitle (card)</Label>
            <Input value={draft.subtitle ?? ''} onChange={(e) => patchDraft({ subtitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Tagline (detail hero)</Label>
            <Input value={draft.tagline ?? ''} onChange={(e) => patchDraft({ tagline: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => patchDraft({ description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Price (₹)</Label>
              <Input type="number" value={draft.price} onChange={(e) => patchDraft({ price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Discount price (₹)</Label>
              <Input
                type="number"
                value={draft.discountPrice ?? ''}
                onChange={(e) => patchDraft({ discountPrice: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist &amp; workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageChecklistEditor
            fibrosisScanIncluded={draft.fibrosisScanIncluded}
            pathologyIncluded={draft.pathologyIncluded}
            consultationIncluded={draft.consultationIncluded}
            onFlagsChange={onWorkflowFlagsChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Highlights</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => updateHighlights([...draft.highlights, { label: '', value: '' }])}>
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {draft.highlights.map((h) => (
            <div key={`${h.label}-${h.value}`} className="flex gap-2">
              <Input placeholder="Label" value={h.label} onChange={(e) => {
                const next = draft.highlights.map((row) => (row === h ? { ...h, label: e.target.value } : row));
                updateHighlights(next);
              }} />
              <Input placeholder="Value" value={h.value} onChange={(e) => {
                const next = draft.highlights.map((row) => (row === h ? { ...h, value: e.target.value } : row));
                updateHighlights(next);
              }} />
              <Button type="button" size="sm" variant="ghost" onClick={() => updateHighlights(draft.highlights.filter((row) => row !== h))}>×</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preparation & audience</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Preparation (one per line)</Label>
            <Textarea rows={3} value={arrayToLines(draft.preparation)} onChange={(e) => patchDraft({ preparation: linesToArray(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Who should book (one per line)</Label>
            <Textarea rows={3} value={arrayToLines(draft.whoShouldBook)} onChange={(e) => patchDraft({ whoShouldBook: linesToArray(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">FAQs</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => updateFaqs([...draft.faqs, { question: '', answer: '' }])}>
            Add FAQ
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.faqs.map((faq) => (
            <div key={faq.question || faq.answer} className="space-y-2 rounded-md border p-3">
              <Input placeholder="Question" value={faq.question} onChange={(e) => {
                const next = draft.faqs.map((row) => (row === faq ? { ...faq, question: e.target.value } : row));
                updateFaqs(next);
              }} />
              <Textarea placeholder="Answer" rows={2} value={faq.answer} onChange={(e) => {
                const next = draft.faqs.map((row) => (row === faq ? { ...faq, answer: e.target.value } : row));
                updateFaqs(next);
              }} />
              <Button type="button" size="sm" variant="ghost" onClick={() => updateFaqs(draft.faqs.filter((row) => row !== faq))}>Remove</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.active} onChange={(e) => patchDraft({ active: e.target.checked })} />
              Active
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.visibilityWeb} onChange={(e) => patchDraft({ visibilityWeb: e.target.checked })} />
              Visible on website
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.recommendedTag} onChange={(e) => patchDraft({ recommendedTag: e.target.checked })} />
              Recommended badge
            </label>
          </div>
          <div className="space-y-1">
            <Label>Terms & conditions</Label>
            <Textarea rows={3} value={draft.termsConditions ?? ''} onChange={(e) => patchDraft({ termsConditions: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : isCreate ? 'Create package' : 'Save changes'}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
