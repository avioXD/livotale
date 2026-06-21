import { useMemo, useRef, useState } from 'react';
import { FiEye, FiSearch } from 'react-icons/fi';
import { StaffDocumentPreviewModal } from '@/app/pages/staff/profile/components/StaffDocumentPreviewModal';
import {
  allDocumentTypesForRole,
  staffProfileConfig,
} from '@/app/pages/staff/profile/staffProfileConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StaffRoleKey } from '@/types/staffHub';
import {
  STAFF_DOCUMENT_LABELS,
  type StaffComplianceDocument,
  type StaffDocumentType,
} from '@/types/staffProfile';

interface StaffLegalDocumentsPanelProps {
  role: StaffRoleKey;
  documents: StaffComplianceDocument[];
  actor: 'self' | 'admin';
  viewMode: 'view' | 'edit';
  isSaving?: boolean;
  usingDemo?: boolean;
  onUploadDocument?: (
    file: File,
    meta: {
      documentType: StaffDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
  ) => void | Promise<void>;
  onVerifyDocument?: (
    documentId: string,
    status: 'verified' | 'rejected' | 'expired',
    notes?: string,
  ) => void | Promise<void>;
}

export function StaffLegalDocumentsPanel({
  role,
  documents,
  actor,
  viewMode,
  isSaving = false,
  usingDemo = false,
  onUploadDocument,
  onVerifyDocument,
}: StaffLegalDocumentsPanelProps) {
  const config = staffProfileConfig(role);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<StaffDocumentType>(config.requiredDocuments[0] ?? 'other');
  const [docNumber, setDocNumber] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [previewDoc, setPreviewDoc] = useState<StaffComplianceDocument | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const canUpload = viewMode === 'edit' && Boolean(onUploadDocument);
  const canReview = actor === 'admin' && Boolean(onVerifyDocument);

  const requiredStatus = useMemo(() => {
    return config.requiredDocuments.map((type) => {
      const uploaded = documents.filter((d) => d.documentType === type);
      const verified = uploaded.find((d) => d.status === 'verified');
      const pending = uploaded.find((d) => d.status === 'pending');
      return {
        type,
        label: STAFF_DOCUMENT_LABELS[type],
        status: verified ? 'verified' : pending ? 'pending' : uploaded.length ? uploaded[0].status : 'missing',
      };
    });
  }, [config.requiredDocuments, documents]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => {
      const label = STAFF_DOCUMENT_LABELS[d.documentType].toLowerCase();
      return (
        label.includes(q)
        || (d.documentNumber ?? '').toLowerCase().includes(q)
        || d.status.includes(q)
        || (d.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [documents, search]);

  const uploadDoc = () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !onUploadDocument) return;
    void onUploadDocument(file, {
      documentType: docType,
      documentNumber: docNumber || undefined,
      notes: docNotes || undefined,
    });
    if (fileRef.current) fileRef.current.value = '';
    setDocNumber('');
    setDocNotes('');
  };

  const submitReject = (documentId: string) => {
    if (!onVerifyDocument) return;
    void onVerifyDocument(documentId, 'rejected', rejectNotes.trim() || undefined);
    setRejectingId(null);
    setRejectNotes('');
  };

  const missingCount = requiredStatus.filter((r) => r.status === 'missing').length;

  return (
    <div className="space-y-4">
      {canReview && (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          Admin review — open each upload to inspect, then approve, reject, or mark as expired.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required documents for {config.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {missingCount > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {missingCount} required document{missingCount === 1 ? '' : 's'} still missing before onboarding is complete.
            </p>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {requiredStatus.map((item) => (
              <li
                key={item.type}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{item.label}</span>
                <Badge
                  variant={
                    item.status === 'verified'
                      ? 'default'
                      : item.status === 'missing'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="capitalize shrink-0"
                >
                  {item.status === 'missing' ? 'required' : item.status}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Uploaded documents</CardTitle>
            <div className="relative w-full max-w-xs">
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents match your search.</p>
          ) : (
            <ul className="space-y-3">
              {filteredDocs.map((doc) => {
                const canApprove = canReview && ['pending', 'rejected', 'expired'].includes(doc.status);
                const canReject = canReview && ['pending', 'verified'].includes(doc.status);
                const canMarkExpired = canReview && doc.status === 'verified';

                return (
                  <li key={doc.id} className="rounded-md border px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{STAFF_DOCUMENT_LABELS[doc.documentType]}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            doc.documentNumber,
                            doc.issuedOn ? `issued ${doc.issuedOn.slice(0, 10)}` : null,
                            doc.expiresOn ? `expires ${doc.expiresOn.slice(0, 10)}` : null,
                            doc.verifiedAt ? `reviewed ${new Date(doc.verifiedAt).toLocaleDateString()}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                        {doc.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">Note: {doc.notes}</p>
                        )}
                      </div>
                      <Badge
                        variant={
                          doc.status === 'verified'
                            ? 'default'
                            : doc.status === 'rejected'
                              ? 'destructive'
                              : doc.status === 'expired'
                                ? 'outline'
                                : 'secondary'
                        }
                        className="capitalize shrink-0"
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {doc.storageUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <FiEye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      )}
                      {canApprove && (
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void onVerifyDocument?.(doc.id, 'verified')}
                        >
                          Approve
                        </Button>
                      )}
                      {canReject && rejectingId !== doc.id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isSaving}
                          onClick={() => {
                            setRejectingId(doc.id);
                            setRejectNotes(doc.notes ?? '');
                          }}
                        >
                          Reject
                        </Button>
                      )}
                      {canMarkExpired && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSaving}
                          onClick={() => void onVerifyDocument?.(doc.id, 'expired')}
                        >
                          Mark expired
                        </Button>
                      )}
                    </div>

                    {rejectingId === doc.id && (
                      <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                        <Label htmlFor={`reject-notes-${doc.id}`}>Rejection reason (optional)</Label>
                        <Textarea
                          id={`reject-notes-${doc.id}`}
                          rows={2}
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="e.g. Document blurry, wrong document type, expired certificate…"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isSaving}
                            onClick={() => submitReject(doc.id)}
                          >
                            Confirm reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload document</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {usingDemo && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Demo mode — uploads are stored locally until API is connected.
              </p>
            )}
            <div>
              <Label>Document type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={docType}
                onChange={(e) => setDocType(e.target.value as StaffDocumentType)}
              >
                {allDocumentTypesForRole(role).map((t) => (
                  <option key={t} value={t}>
                    {STAFF_DOCUMENT_LABELS[t]}
                    {config.requiredDocuments.includes(t) ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Document number (optional)</Label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input value={docNotes} onChange={(e) => setDocNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Input ref={fileRef} type="file" accept="image/*,.pdf" />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" disabled={isSaving} onClick={uploadDoc}>
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'view' && actor === 'self' && (
        <p className="text-xs text-muted-foreground">
          Switch to edit mode to upload missing documents. HR reviews uploads and updates verification status.
        </p>
      )}

      <StaffDocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
