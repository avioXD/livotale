export type RouteRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AvailableRouteOrder {
  sampleCollectionId: string;
  sampleCode: string;
  collectionStatus: string;
  appointmentId: string;
  appointmentCode: string | null;
  patientName: string | null;
  patientCode: string | null;
  pincode: string | null;
  line1: string | null;
  cityName: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  typeName: string | null;
  pendingRequestId: string | null;
  requestStatus: RouteRequestStatus | null;
}

export interface TechnicianRouteRequest {
  id: string;
  sampleCollectionId: string;
  technicianId: string;
  technicianName: string | null;
  status: RouteRequestStatus;
  requestNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  requestedAt: string;
  sampleCode: string;
  appointmentId: string;
  appointmentCode: string | null;
  patientName: string | null;
  patientCode: string | null;
  pincode: string | null;
  line1: string | null;
  cityName: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  typeName: string | null;
  collectionStatus: string;
}
