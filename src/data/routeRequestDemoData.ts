import type { AvailableRouteOrder, TechnicianRouteRequest } from '@/types/routeRequest';

function slotOnDate(date: string, hour: number, minute = 0): string {
  const d = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return d.toISOString();
}

function endSlot(start: string, minutes: number): string {
  return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
}

const DEMO_ORDERS: Omit<AvailableRouteOrder, 'scheduledStart' | 'scheduledEnd' | 'pendingRequestId' | 'requestStatus'>[] = [
  {
    sampleCollectionId: 'demo-route-sc-1',
    sampleCode: 'LGSC-DEMO-000001',
    collectionStatus: 'pending_technician_assignment',
    appointmentId: 'demo-route-appt-1',
    appointmentCode: 'APT-DEMO-ROUTE-01',
    patientName: 'Rajesh Mehta',
    patientCode: 'PAT-1042',
    pincode: '400050',
    line1: '12 Hill Road, Bandra West',
    cityName: 'Mumbai',
    typeName: 'Home blood collection',
  },
  {
    sampleCollectionId: 'demo-route-sc-2',
    sampleCode: 'LGSC-DEMO-000008',
    collectionStatus: 'pending_technician_assignment',
    appointmentId: 'demo-route-appt-2',
    appointmentCode: 'APT-DEMO-ROUTE-02',
    patientName: 'Priya Nair',
    patientCode: 'PAT-1088',
    pincode: '400013',
    line1: '44 Turner Road, Bandra',
    cityName: 'Mumbai',
    typeName: 'Liver Fibrosis Scan + blood draw',
  },
];

let demoMyRequests: TechnicianRouteRequest[] = [];
let demoAdminPending: TechnicianRouteRequest[] = [];
let demoModeActive = false;

export function markRouteRequestDemoActive(): void {
  demoModeActive = true;
}

export function isRouteRequestDemoActive(): boolean {
  return demoModeActive;
}

export function isRouteRequestDemoId(id: string): boolean {
  return id.startsWith('demo-route-');
}

export function getRouteRequestDemoOrders(date: string): AvailableRouteOrder[] {
  const pendingBySample = new Map(
    demoMyRequests.filter((r) => r.status === 'pending').map((r) => [r.sampleCollectionId, r.id]),
  );
  return DEMO_ORDERS.map((order, index) => {
    const scheduledStart = slotOnDate(date, 9 + index * 2, 30);
    const pendingId = pendingBySample.get(order.sampleCollectionId) ?? null;
    return {
      ...order,
      scheduledStart,
      scheduledEnd: endSlot(scheduledStart, 45),
      pendingRequestId: pendingId,
      requestStatus: pendingId ? 'pending' : null,
    };
  });
}

export function getRouteRequestDemoMyRequests(): TechnicianRouteRequest[] {
  return [...demoMyRequests].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export function getRouteRequestDemoAdminPending(): TechnicianRouteRequest[] {
  return [...demoAdminPending];
}

export function createDemoRouteRequest(sampleCollectionId: string, note?: string): TechnicianRouteRequest {
  const order = DEMO_ORDERS.find((o) => o.sampleCollectionId === sampleCollectionId);
  if (!order) throw new Error('Demo order not found');

  const existing = demoMyRequests.find(
    (r) => r.sampleCollectionId === sampleCollectionId && r.status === 'pending',
  );
  if (existing) throw new Error('You already have a pending request for this order');

  const scheduledStart = slotOnDate(new Date().toISOString().slice(0, 10), 10, 0);
  const req: TechnicianRouteRequest = {
    id: `demo-route-req-${Date.now()}`,
    sampleCollectionId,
    technicianId: 'demo-technician',
    technicianName: 'Demo Technician',
    status: 'pending',
    requestNote: note?.trim() || null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    requestedAt: new Date().toISOString(),
    sampleCode: order.sampleCode,
    appointmentId: order.appointmentId,
    appointmentCode: order.appointmentCode,
    patientName: order.patientName,
    patientCode: order.patientCode,
    pincode: order.pincode,
    line1: order.line1,
    cityName: order.cityName,
    scheduledStart,
    scheduledEnd: endSlot(scheduledStart, 45),
    typeName: order.typeName,
    collectionStatus: order.collectionStatus,
  };
  demoMyRequests = [req, ...demoMyRequests];
  demoAdminPending = [req, ...demoAdminPending];
  return req;
}

export function approveDemoRouteRequest(id: string, note?: string): TechnicianRouteRequest {
  const req = demoAdminPending.find((r) => r.id === id);
  if (!req) throw new Error('Demo route request not found');
  const updated: TechnicianRouteRequest = {
    ...req,
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewNote: note?.trim() || 'Approved (demo)',
  };
  demoAdminPending = demoAdminPending.filter((r) => r.id !== id);
  demoMyRequests = demoMyRequests.map((r) => (r.id === id ? updated : r));
  return updated;
}

export function rejectDemoRouteRequest(id: string, note?: string): TechnicianRouteRequest {
  const req = demoAdminPending.find((r) => r.id === id) ?? demoMyRequests.find((r) => r.id === id);
  if (!req) throw new Error('Demo route request not found');
  const updated: TechnicianRouteRequest = {
    ...req,
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewNote: note?.trim() || 'Rejected (demo)',
  };
  demoAdminPending = demoAdminPending.filter((r) => r.id !== id);
  demoMyRequests = demoMyRequests.map((r) => (r.id === id ? updated : r));
  return updated;
}

export function resetRouteRequestDemoState(): void {
  demoMyRequests = [];
  demoAdminPending = [];
}
