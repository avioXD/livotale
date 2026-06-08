import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAdminRole } from '@/app/config/productRoles';
import { partnerLabService } from '@/services/liverCare';
import { useUserRole } from '@/store';
import type { PartnerLab } from '@/types/partnerLab';

export function AdminPartnerLabsPage() {
  const userRole = useUserRole();
  const canEdit = isAdminRole(userRole);
  const [labs, setLabs] = useState<PartnerLab[]>([]);
  const [selected, setSelected] = useState<PartnerLab | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const rows = await partnerLabService.list(false);
    setLabs(rows);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await partnerLabService.update(selected.id, { notes });
      await load();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner labs"
        description={canEdit ? 'Manage pathology partner records, contracts, and tie-up details.' : 'View partner lab records (operations — read only).'}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {labs.map((lab) => (
          <Card key={lab.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{lab.name}</CardTitle>
                <Badge variant={lab.active ? 'default' : 'outline'}>{lab.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{lab.contactPerson} · {lab.phone}</p>
              <p className="text-muted-foreground">{lab.address}, {lab.city} {lab.pincode}</p>
              {lab.gstNumber && <p>GST: {lab.gstNumber}</p>}
              <p className="text-muted-foreground">
                Contract: {lab.contractStart ?? '—'} → {lab.contractEnd ?? '—'}
              </p>
              <p className="text-muted-foreground">
                Tests: {lab.supportedTests.join(', ')}
              </p>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => { setSelected(lab); setNotes(lab.notes ?? ''); }}>
                  Edit notes
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit {selected.name}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>Save</Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
