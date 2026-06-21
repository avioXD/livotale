import { useRef } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  demoDocumentFromFile,
  emptyPocRow,
  isPartnerLabDraftValid,
} from '@/app/pages/admin/labs/partnerLabFormUtils';
import type { PartnerLabBillingCycle, PartnerLabDraft, PartnerLabDocument } from '@/types/partnerLab';

function linesToTests(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function testsToLines(tests: string[]): string {
  return tests.join('\n');
}

interface PartnerLabFormPanelProps {
  draft: PartnerLabDraft;
  onChange: (patch: Partial<PartnerLabDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  isCreate?: boolean;
}

function DocumentEditor({
  title,
  description,
  doc,
  onChange,
  onClear,
}: {
  title: string;
  description?: string;
  doc: PartnerLabDocument | null | undefined;
  onChange: (doc: PartnerLabDocument | null) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Document label</Label>
          <Input
            value={doc?.label ?? ''}
            placeholder="e.g. Pathology tie-up agreement"
            onChange={(e) =>
              onChange(
                doc
                  ? { ...doc, label: e.target.value }
                  : {
                      id: `doc-${Date.now()}`,
                      label: e.target.value,
                      fileName: '',
                      fileUrl: '',
                      uploadedAt: new Date().toISOString(),
                    },
              )
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">File name</Label>
          <Input
            value={doc?.fileName ?? ''}
            placeholder="document.pdf"
            onChange={(e) =>
              onChange(
                doc
                  ? { ...doc, fileName: e.target.value }
                  : {
                      id: `doc-${Date.now()}`,
                      label: '',
                      fileName: e.target.value,
                      fileUrl: '',
                      uploadedAt: new Date().toISOString(),
                    },
              )
            }
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const next = demoDocumentFromFile(doc?.label || title, file);
            onChange({ ...next, label: doc?.label || title });
            e.target.value = '';
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          Upload file
        </Button>
        {doc?.fileUrl && (
          <>
            <Button type="button" size="sm" variant="ghost" asChild>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                Preview
              </a>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function PartnerLabFormPanel({
  draft,
  onChange,
  onSave,
  onCancel,
  saving = false,
  isCreate = false,
}: PartnerLabFormPanelProps) {
  const patch = onChange;
  const valid = isPartnerLabDraftValid(draft);

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lab identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="lab-name">Lab name</Label>
            <Input
              id="lab-name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="lab-active"
              type="checkbox"
              checked={draft.active}
              onChange={(e) => patch({ active: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="lab-active">Active partner — available for order assignment</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Primary point of contact (POC)</CardTitle>
          <CardDescription>Main contact for operations, sample dispatch, and report follow-up.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="lab-poc-name">Name</Label>
            <Input
              id="lab-poc-name"
              value={draft.contactPerson}
              onChange={(e) => patch({ contactPerson: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-poc-role">Designation</Label>
            <Input
              id="lab-poc-role"
              placeholder="Lab Director, Ops coordinator…"
              value={draft.contactDesignation ?? ''}
              onChange={(e) => patch({ contactDesignation: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-poc-phone">Phone</Label>
            <Input
              id="lab-poc-phone"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-poc-email">Email</Label>
            <Input
              id="lab-poc-email"
              type="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Additional POCs</CardTitle>
            <CardDescription>Billing, lab manager, or alternate contacts.</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => patch({ pocContacts: [...draft.pocContacts, emptyPocRow()] })}>
            <FiPlus className="mr-1 h-4 w-4" /> Add POC
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.pocContacts.length === 0 && (
            <p className="text-sm text-muted-foreground">No additional contacts — add if needed.</p>
          )}
          {draft.pocContacts.map((poc, index) => (
            <div key={poc.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={poc.name}
                  onChange={(e) => {
                    const pocContacts = [...draft.pocContacts];
                    pocContacts[index] = { ...poc, name: e.target.value };
                    patch({ pocContacts });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input
                  value={poc.designation}
                  onChange={(e) => {
                    const pocContacts = [...draft.pocContacts];
                    pocContacts[index] = { ...poc, designation: e.target.value };
                    patch({ pocContacts });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  inputMode="tel"
                  value={poc.phone}
                  onChange={(e) => {
                    const pocContacts = [...draft.pocContacts];
                    pocContacts[index] = { ...poc, phone: e.target.value };
                    patch({ pocContacts });
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={poc.email}
                    onChange={(e) => {
                      const pocContacts = [...draft.pocContacts];
                      pocContacts[index] = { ...poc, email: e.target.value };
                      patch({ pocContacts });
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove POC"
                  onClick={() => patch({ pocContacts: draft.pocContacts.filter((_, i) => i !== index) })}
                >
                  <FiTrash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Address & registration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="lab-address">Address</Label>
            <Textarea
              id="lab-address"
              rows={2}
              value={draft.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-city">City</Label>
            <Input id="lab-city" value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-state">State</Label>
            <Input id="lab-state" value={draft.state} onChange={(e) => patch({ state: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-pincode">Pincode</Label>
            <Input id="lab-pincode" value={draft.pincode} onChange={(e) => patch({ pincode: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-gst">GST number</Label>
            <Input id="lab-gst" value={draft.gstNumber ?? ''} onChange={(e) => patch({ gstNumber: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="lab-reg">Lab registration number</Label>
            <Input
              id="lab-reg"
              value={draft.registrationNumber ?? ''}
              onChange={(e) => patch({ registrationNumber: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contract & billing cycle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="lab-contract-start">Contract start</Label>
            <Input
              id="lab-contract-start"
              type="date"
              value={draft.contractStart ?? ''}
              onChange={(e) => patch({ contractStart: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-contract-end">Contract end</Label>
            <Input
              id="lab-contract-end"
              type="date"
              value={draft.contractEnd ?? ''}
              onChange={(e) => patch({ contractEnd: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lab-billing-cycle">Billing cycle</Label>
            <select
              id="lab-billing-cycle"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={draft.billingCycle}
              onChange={(e) => patch({ billingCycle: e.target.value as PartnerLabBillingCycle })}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Tests & per-test pricing</CardTitle>
            <CardDescription>Supported pathology tests and negotiated rates (INR).</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patch({ chargesPerTest: [...draft.chargesPerTest, { testName: '', chargeInr: 0 }] })}
          >
            <FiPlus className="mr-1 h-4 w-4" /> Add test
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="lab-supported-tests">Supported tests (one per line)</Label>
            <Textarea
              id="lab-supported-tests"
              rows={4}
              placeholder={'LFT panel\nCBC\nViral markers'}
              value={testsToLines(draft.supportedTests)}
              onChange={(e) => patch({ supportedTests: linesToTests(e.target.value) })}
            />
          </div>
          {draft.chargesPerTest.map((row, index) => (
            <div key={`${row.testName}-${index}`} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1 space-y-1">
                <Label className="text-xs">Test name</Label>
                <Input
                  value={row.testName}
                  onChange={(e) => {
                    const chargesPerTest = [...draft.chargesPerTest];
                    chargesPerTest[index] = { ...row, testName: e.target.value };
                    patch({ chargesPerTest });
                  }}
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Charge (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={row.chargeInr || ''}
                  onChange={(e) => {
                    const chargesPerTest = [...draft.chargesPerTest];
                    chargesPerTest[index] = { ...row, chargeInr: Number(e.target.value) || 0 };
                    patch({ chargesPerTest });
                  }}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove test"
                onClick={() => patch({ chargesPerTest: draft.chargesPerTest.filter((_, i) => i !== index) })}
              >
                <FiTrash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="lab-package-charge">Package charge per report (₹)</Label>
              <Input
                id="lab-package-charge"
                inputMode="numeric"
                value={draft.packageCharges ?? ''}
                onChange={(e) => patch({ packageCharges: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lab-annual">Annual tie-up charges (₹)</Label>
              <Input
                id="lab-annual"
                inputMode="numeric"
                value={draft.annualTieupCharges ?? ''}
                onChange={(e) => patch({ annualTieupCharges: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Legal documents</CardTitle>
          <CardDescription>Registration, GST, tie-up agreement, and report format reference.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentEditor
            title="Tie-up agreement"
            description="Signed pathology partnership agreement"
            doc={draft.agreementDoc}
            onChange={(doc) => patch({ agreementDoc: doc })}
            onClear={() => patch({ agreementDoc: null })}
          />
          <DocumentEditor
            title="Sample report format"
            description="Reference PDF showing how this lab formats pathology reports"
            doc={draft.reportFormatSample}
            onChange={(doc) => patch({ reportFormatSample: doc })}
            onClear={() => patch({ reportFormatSample: null })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Other compliance documents</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({
                    legalDocuments: [
                      ...draft.legalDocuments,
                      {
                        id: `doc-${Date.now()}`,
                        label: '',
                        fileName: '',
                        fileUrl: '',
                        uploadedAt: new Date().toISOString(),
                      },
                    ],
                  })
                }
              >
                <FiPlus className="mr-1 h-4 w-4" /> Add document
              </Button>
            </div>
            {draft.legalDocuments.map((doc, index) => (
              <div key={doc.id} className="space-y-2">
                <DocumentEditor
                  title={`Document ${index + 1}`}
                  doc={doc}
                  onChange={(next) => {
                    if (!next) return;
                    const legalDocuments = [...draft.legalDocuments];
                    legalDocuments[index] = next;
                    patch({ legalDocuments });
                  }}
                  onClear={() => patch({ legalDocuments: draft.legalDocuments.filter((_, i) => i !== index) })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="Ops context — dispatch instructions, email aliases, SLA notes…"
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={saving || !valid}>
          {saving ? 'Saving…' : isCreate ? 'Create lab partner' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
