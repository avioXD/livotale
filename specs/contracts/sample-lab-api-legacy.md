# API Contract: Sample Collection & Lab Workflow

**Spec**: [spec.md](../spec.md)

All responses wrapped in `{ data: T }`. Auth via JWT bearer.

## Sample Collections (shared)

```
GET    /sample-collections/:id              — role-scoped detail
GET    /patients/me/sample-collections      — patient list
GET    /patients/me/sample-collections/:id  — patient detail (no photo)
```

## Technician

```
GET    /technician/sample-collections/today
GET    /technician/sample-collections/:id
POST   /technician/sample-collections/:id/accept
POST   /technician/sample-collections/:id/travel-started
POST   /technician/sample-collections/:id/reached
POST   /technician/sample-collections/:id/start-collection
POST   /technician/sample-collections/:id/collect
POST   /technician/sample-collections/:id/photo        { fileId, latitude?, longitude? }
POST   /technician/sample-collections/:id/handover     { labPartnerId, containerCount, condition, remarks }
POST   /technician/sample-collections/:id/failed       { reasonCode, remarks }
```

## Lab (lab_partner)

```
GET    /lab/sample-collections?status=pending_receive
GET    /lab/sample-collections/:id                     — includes sample photo
POST   /lab/sample-collections/:id/receive             { containerCount, condition, remarks }
POST   /lab/sample-collections/:id/reject              { reasonCode, remarks }
POST   /lab/sample-collections/:id/start-testing
POST   /lab/sample-collections/:id/results             { items: [...] }
POST   /lab/sample-collections/:id/reports             { fileId, reportDate }
POST   /lab/sample-collections/:id/submit-approval
```

## Admin

```
GET    /admin/sample-collections?status=&dateFrom=&pincode=
GET    /admin/sample-collections/dashboard
POST   /admin/sample-collections/:id/assign-technician { technicianId, reason? }
POST   /admin/sample-collections/:id/recollection
POST   /admin/sample-collections/:id/reports/:reportId/approve
POST   /admin/sample-collections/:id/reports/:reportId/publish
GET    /admin/sample-collection-config
PUT    /admin/sample-collection-config
```

## Response: SampleCollectionDetail

```typescript
interface SampleCollectionDetail {
  id: string;
  sampleCode: string;           // LGSC-YYYYMMDD-000001
  appointmentId: string;
  patientId: string;
  patientName: string;
  status: string;
  collectionType: 'home' | 'hospital' | 'center';
  technicianId?: string | null;
  technicianName?: string | null;
  labPartnerId?: string | null;
  pincode?: string | null;
  scheduledStart: string;
  sampleType?: string | null;
  tubesCount?: number | null;
  photos?: SamplePhoto[];      // omitted for patient
  timeline: StatusHistoryEntry[];
  canViewPhoto: boolean;
}
```

## Booking hook

Existing `POST /patient/appointments` and `POST /admin/appointments/walk-in` responses include:

```typescript
sampleCollection?: { id: string; sampleCode: string; status: string };
```

when appointment type requires sample collection.
