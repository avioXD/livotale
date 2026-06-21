import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SampleBottlePhotos, SampleIntegrityBadge } from '@/app/pages/sample-collection/components/SampleIntegrityPanel';
import { SampleCollectionPipelineStages } from '@/app/pages/sample-collection/components/SampleCollectionPipelineStages';
import { formatSampleStatus } from '@/app/pages/sample-collection/sampleCollectionPipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AdminSampleCollectionUpdate, SampleCollection, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import { orgPath } from '@/app/config/orgRoutes';

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

interface AdminSampleCollectionDetailPanelProps {
  sample: SampleCollection;
  technicians: StaffTechnicianProfile[];
  labPartners: StaffLabPartnerProfile[];
  isSaving: boolean;
  onSave: (payload: AdminSampleCollectionUpdate) => void;
  onAssign: (technicianId: string) => void;
}

export function AdminSampleCollectionDetailPanel({
  sample,
  technicians,
  labPartners,
  isSaving,
  onSave,
  onAssign,
}: AdminSampleCollectionDetailPanelProps) {
  const [priority, setPriority] = useState(sample.priority);
  const [pincode, setPincode] = useState(sample.pincode ?? '');
  const [sampleType, setSampleType] = useState(sample.sampleType ?? '');
  const [tubesCount, setTubesCount] = useState(sample.tubesCount != null ? String(sample.tubesCount) : '');
  const [containerType, setContainerType] = useState(sample.containerType ?? '');
  const [fastingStatus, setFastingStatus] = useState(sample.fastingStatus ?? '');
  const [collectionRemarks, setCollectionRemarks] = useState(sample.collectionRemarks ?? '');
  const [labPartnerId, setLabPartnerId] = useState(sample.labPartnerId ?? '');
  const [technicianId, setTechnicianId] = useState(sample.technicianId ?? '');

  useEffect(() => {
    setPriority(sample.priority);
    setPincode(sample.pincode ?? '');
    setSampleType(sample.sampleType ?? '');
    setTubesCount(sample.tubesCount != null ? String(sample.tubesCount) : '');
    setContainerType(sample.containerType ?? '');
    setFastingStatus(sample.fastingStatus ?? '');
    setCollectionRemarks(sample.collectionRemarks ?? '');
    setLabPartnerId(sample.labPartnerId ?? '');
    setTechnicianId(sample.technicianId ?? '');
  }, [sample]);

  const isTerminal = TERMINAL_STATUSES.has(sample.status);
  const canEditSpecs = !isTerminal;
  const canAssignTech = ['pending_technician_assignment', 'assigned'].includes(sample.status);
  const address = [sample.line1, sample.line2, sample.cityName, sample.pincode].filter(Boolean).join(', ');
  const tests = sample.requestedTests ?? [];

  const handleSave = () => {
    onSave({
      priority,
      pincode: pincode.trim() || null,
      sampleType: canEditSpecs ? (sampleType.trim() || null) : undefined,
      tubesCount: canEditSpecs && tubesCount.trim() ? Number(tubesCount) : canEditSpecs ? null : undefined,
      containerType: canEditSpecs ? (containerType.trim() || null) : undefined,
      fastingStatus: canEditSpecs ? (fastingStatus.trim() || null) : undefined,
      collectionRemarks: collectionRemarks.trim() || null,
      labPartnerId: canEditSpecs ? (labPartnerId || null) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {formatSampleStatus(sample.status)}
        </Badge>
        {sample.appointmentStatus && (
          <Badge variant="secondary" className="capitalize">
            Appt: {sample.appointmentStatus.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline stages
        </h3>
        <SampleCollectionPipelineStages currentStatus={sample.status} />
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Admin updates</h3>
          <Button size="sm" disabled={isSaving} onClick={handleSave}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="admin-priority">Priority</Label>
            <select
              id="admin-priority"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-pincode">Service pincode</Label>
            <Input
              id="admin-pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              disabled={!canEditSpecs}
              placeholder="e.g. 400013"
            />
          </div>
          {canEditSpecs && (
            <>
              <div className="space-y-1">
                <Label htmlFor="admin-sample-type">Sample type</Label>
                <Input id="admin-sample-type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} placeholder="blood" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-tubes">Tubes count</Label>
                <Input id="admin-tubes" type="number" min={0} value={tubesCount} onChange={(e) => setTubesCount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-container">Container</Label>
                <Input id="admin-container" value={containerType} onChange={(e) => setContainerType(e.target.value)} placeholder="EDTA" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-fasting">Fasting</Label>
                <select
                  id="admin-fasting"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={fastingStatus}
                  onChange={(e) => setFastingStatus(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="fasting">Fasting</option>
                  <option value="non_fasting">Non-fasting</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="admin-lab-partner">Lab partner</Label>
                <select
                  id="admin-lab-partner"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={labPartnerId}
                  onChange={(e) => setLabPartnerId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {labPartners.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="admin-remarks">Collection remarks</Label>
            <Textarea
              id="admin-remarks"
              value={collectionRemarks}
              onChange={(e) => setCollectionRemarks(e.target.value)}
              rows={3}
              placeholder="Admin or field notes for this collection"
            />
          </div>
        </div>

        {canAssignTech && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="min-w-[16rem] flex-1 space-y-1">
              <Label htmlFor="admin-assign-tech">Technician</Label>
              <select
                id="admin-assign-tech"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">Select technician</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.fullName} · {tech.employeeCode}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              disabled={isSaving || !technicianId}
              onClick={() => onAssign(technicianId)}
            >
              {sample.status === 'pending_technician_assignment' ? 'Assign' : 'Reassign'} technician
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Order & patient</h3>
        <dl className="space-y-2">
          <DetailRow label="Sample ID" value={<span className="font-mono">{sample.sampleCode}</span>} />
          <DetailRow label="Lab order" value={sample.labOrderId} />
          <DetailRow
            label="Appointment"
            value={
              sample.appointmentCode ? (
                <Link to={orgPath(`/admin/appointments/${sample.appointmentId}`)} className="text-livotale-pink hover:underline">
                  {sample.appointmentCode}
                </Link>
              ) : (
                sample.appointmentId
              )
            }
          />
          <DetailRow
            label="Patient"
            value={
              <Link to={orgPath(`/patients/${sample.patientId}`)} className="text-livotale-pink hover:underline">
                {sample.patientName}
                {sample.patientCode ? ` · ${sample.patientCode}` : ''}
              </Link>
            }
          />
          <DetailRow label="Mobile" value={sample.patientMobile} />
          <DetailRow label="Service" value={sample.typeName} />
          <DetailRow label="Collection" value={<span className="capitalize">{sample.collectionType}</span>} />
          <DetailRow label="Address" value={address || null} />
          <DetailRow
            label="Scheduled"
            value={
              sample.scheduledStart
                ? `${formatWhen(sample.scheduledStart)}${sample.scheduledEnd ? ` – ${formatWhen(sample.scheduledEnd)}` : ''}`
                : null
            }
          />
          <DetailRow label="Technician" value={sample.technicianName ?? 'Unassigned'} />
        </dl>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Key timestamps</h3>
        <dl className="space-y-2">
          <DetailRow label="Assigned" value={formatWhen(sample.assignedAt)} />
          <DetailRow label="Collected" value={formatWhen(sample.collectedAt)} />
          <DetailRow label="Handed to lab" value={formatWhen(sample.handedOverAt)} />
          <DetailRow label="Lab received" value={formatWhen(sample.receivedAt)} />
          <DetailRow label="Report published" value={formatWhen(sample.reportPublishedAt)} />
        </dl>
      </section>

      <SampleIntegrityBadge
        sampleCode={sample.sampleCode}
        patientName={sample.patientName}
        patientCode={sample.patientCode}
        qrVerificationCode={sample.qrVerificationCode}
      />

      {(sample.timeline?.length ?? 0) > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Status history
          </h3>
          <ol className="space-y-2 border-l-2 border-border pl-4">
            {sample.timeline!.map((entry, idx) => (
              <li key={`${entry.occurredAt}-${idx}`} className="relative text-sm">
                <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="font-medium capitalize">{formatSampleStatus(entry.toStatus)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(entry.occurredAt)}
                  {entry.actorRole ? ` · ${entry.actorRole.replace(/_/g, ' ')}` : ''}
                  {entry.reason ? ` · ${entry.reason}` : ''}
                </p>
                {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-2 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Chain-of-custody photos</h3>
        <SampleBottlePhotos photos={sample.photos} emptyMessage="No bottle photos uploaded yet." />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">
          Requested tests
          {(sample.requestedTestCount ?? tests.length) > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({sample.requestedTestCount ?? tests.length})
            </span>
          )}
        </h3>
        {tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tests linked to this lab order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Test</th>
                  <th className="py-2 pr-2">Reference</th>
                  <th className="py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.labTestId} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <p className="font-medium">{test.name}</p>
                      <p className="text-xs text-muted-foreground">{test.code}</p>
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{test.referenceRange ?? '—'}</td>
                    <td className="py-2">
                      {test.resultText ?? (test.resultValue != null ? String(test.resultValue) : '—')}
                      {test.flag && test.flag !== 'unknown' && (
                        <span className="ml-1 text-xs capitalize text-muted-foreground">({test.flag})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(sample.reports?.length ?? 0) > 0 && (
        <section className="space-y-2 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Reports</h3>
          <ul className="space-y-2 text-sm">
            {sample.reports!.map((report) => (
              <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium">{report.reportCode ?? report.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.reportDate ?? '—'}
                    {report.approvalStatus ? ` · ${report.approvalStatus}` : ''}
                  </p>
                </div>
                <Badge variant={report.verified ? 'default' : 'outline'}>
                  {report.verified ? 'Verified' : 'Pending'}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
