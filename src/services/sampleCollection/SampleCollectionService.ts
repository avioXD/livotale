import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  AdminSampleCollectionUpdate,
  SampleCollection,
  SampleCollectionConfig,
  SamplePhotoType,
} from '@/types/sampleCollection';
import type { AvailableRouteOrder, TechnicianRouteRequest } from '@/types/routeRequest';
import {
  approveDemoRouteRequest,
  createDemoRouteRequest,
  getAdminDemoSampleById,
  getLabDemoSampleById,
  getRouteRequestDemoAdminPending,
  getRouteRequestDemoMyRequests,
  getRouteRequestDemoOrders,
  LAB_DEMO_SAMPLES,
  listAdminDemoSamples,
  markRouteRequestDemoActive,
  rejectDemoRouteRequest,
  updateAdminDemoSample,
} from './sampleCollection.mock';

class SampleCollectionService extends BaseApiService {
  async listTechnicianToday(date?: string): Promise<SampleCollection[]> {
    return mockOrApi(
      () => listAdminDemoSamples({ status: 'assigned' }),
      () =>
        this.get<SampleCollection[]>('/technician/sample-collections/today', {
          params: date ? { date } : undefined,
        }),
    );
  }

  async getTechnicianById(id: string): Promise<SampleCollection> {
    return mockOrApi(
      () => {
        const demo = getAdminDemoSampleById(id) ?? getLabDemoSampleById(id);
        if (!demo) throw new Error('Sample collection not found');
        return demo;
      },
      () => this.get<SampleCollection>(`/technician/sample-collections/${id}`),
    );
  }

  async getByAppointment(appointmentId: string): Promise<SampleCollection | null> {
    return mockOrApi(
      () =>
        listAdminDemoSamples().find((s) => s.appointmentId === appointmentId) ??
        LAB_DEMO_SAMPLES.find((s) => s.appointmentId === appointmentId) ??
        null,
      () => this.get<SampleCollection | null>(`/technician/sample-collections/by-appointment/${appointmentId}`),
    );
  }

  async technicianAction(id: string, action: string, body: Record<string, unknown> = {}) {
    return mockOrApi(
      () => {
        const updated = updateAdminDemoSample(id, { status: action as SampleCollection['status'], ...body });
        if (!updated) throw new Error('Sample collection not found');
        return updated;
      },
      () => this.post<SampleCollection>(`/technician/sample-collections/${id}/${action}`, body),
    );
  }

  async uploadPhoto(
    id: string,
    file: File,
    geo?: { latitude: number; longitude: number },
    photoType: SamplePhotoType = 'container_label',
  ) {
    const storageUrl = await this.fileToDataUrl(file);
    return mockOrApi(
      () => {
        const existing = getAdminDemoSampleById(id);
        if (!existing) throw new Error('Sample collection not found');
        return updateAdminDemoSample(id, {
          photos: [
            ...(existing.photos ?? []),
            {
              id: `photo-${Date.now()}`,
              fileId: null,
              photoType,
              createdAt: new Date().toISOString(),
              storageUrl,
              latitude: geo?.latitude,
              longitude: geo?.longitude,
            },
          ],
        })!;
      },
      () =>
        this.post<SampleCollection>(`/technician/sample-collections/${id}/photo`, {
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          storageUrl,
          photoType,
          latitude: geo?.latitude,
          longitude: geo?.longitude,
        }),
    );
  }

  async handover(id: string, body: Record<string, unknown>) {
    return mockOrApi(
      () => updateAdminDemoSample(id, { status: 'handed_over_to_lab', ...body })!,
      () => this.post<SampleCollection>(`/technician/sample-collections/${id}/handover`, body),
    );
  }

  async listAdmin(filters: { status?: string; pincode?: string; limit?: number } = {}) {
    return mockOrApi(
      () => listAdminDemoSamples({ status: filters.status }),
      () => this.get<SampleCollection[]>('/admin/sample-collections', { params: filters }),
    );
  }

  async getAdminById(id: string): Promise<SampleCollection> {
    return mockOrApi(
      () => {
        const demo = getAdminDemoSampleById(id);
        if (demo) return demo;
        const list = listAdminDemoSamples();
        if (list[0]) return list[0];
        throw new Error('Sample collection not found');
      },
      () => this.get<SampleCollection>(`/admin/sample-collections/${id}`),
    );
  }

  async updateAdminDetails(id: string, body: AdminSampleCollectionUpdate): Promise<SampleCollection> {
    return mockOrApi(
      () => {
        const updated = updateAdminDemoSample(id, {
          priority: body.priority,
          pincode: body.pincode ?? undefined,
          sampleType: body.sampleType ?? undefined,
          tubesCount: body.tubesCount ?? undefined,
          containerType: body.containerType ?? undefined,
          fastingStatus: body.fastingStatus ?? undefined,
          collectionRemarks: body.collectionRemarks ?? undefined,
          labPartnerId: body.labPartnerId ?? undefined,
        });
        if (!updated) throw new Error('Sample collection not found');
        return updated;
      },
      () => this.patch<SampleCollection>(`/admin/sample-collections/${id}`, body),
    );
  }

  async assignTechnician(id: string, technicianId: string, reason?: string) {
    return mockOrApi(
      () => {
        const existing = getAdminDemoSampleById(id);
        if (!existing) throw new Error('Sample collection not found');
        return updateAdminDemoSample(id, {
          technicianId,
          technicianName: 'Vinod K.',
          status: 'assigned',
          assignedAt: new Date().toISOString(),
          collectionRemarks: reason ?? existing.collectionRemarks,
        })!;
      },
      () =>
        this.post<SampleCollection>(`/admin/sample-collections/${id}/assign-technician`, {
          technicianId,
          reason,
        }),
    );
  }

  async approveReport(sampleId: string, reportId: string, notes?: string) {
    return mockOrApi(
      () => updateAdminDemoSample(sampleId, { status: 'approved', collectionRemarks: notes ?? null })!,
      () => this.post<SampleCollection>(`/admin/sample-collections/${sampleId}/reports/${reportId}/approve`, { notes }),
    );
  }

  async publishToPatient(id: string) {
    return mockOrApi(
      () => updateAdminDemoSample(id, { status: 'published_to_patient', reportPublishedAt: new Date().toISOString() })!,
      () => this.post<SampleCollection>(`/admin/sample-collections/${id}/publish`),
    );
  }

  async getConfig(): Promise<SampleCollectionConfig> {
    return mockOrApi(
      () => ({
        collection_duration_minutes: 45,
        travel_buffer_minutes: 20,
        max_daily_appointments_per_technician: 12,
      }),
      () => this.get<SampleCollectionConfig>('/admin/sample-collection-config'),
    );
  }

  async listAvailableRouteOrders(date?: string): Promise<AvailableRouteOrder[]> {
    const day = date ?? new Date().toISOString().slice(0, 10);
    return mockOrApi(
      () => {
        markRouteRequestDemoActive();
        return getRouteRequestDemoOrders(day);
      },
      () =>
        this.get<AvailableRouteOrder[]>('/technician/route-requests/available', {
          params: { date: day },
        }),
    );
  }

  async listMyRouteRequests(status?: string): Promise<TechnicianRouteRequest[]> {
    return mockOrApi(
      () => {
        markRouteRequestDemoActive();
        const mine = getRouteRequestDemoMyRequests();
        return status ? mine.filter((r) => r.status === status) : mine;
      },
      () =>
        this.get<TechnicianRouteRequest[]>('/technician/route-requests', {
          params: status ? { status } : undefined,
        }),
    );
  }

  async requestRoute(sampleCollectionId: string, note?: string): Promise<TechnicianRouteRequest> {
    return mockOrApi(
      () => createDemoRouteRequest(sampleCollectionId, note),
      () =>
        this.post<TechnicianRouteRequest>('/technician/route-requests', {
          sampleCollectionId,
          note,
        }),
    );
  }

  async listAdminRouteRequests(status = 'pending'): Promise<TechnicianRouteRequest[]> {
    return mockOrApi(
      () => {
        markRouteRequestDemoActive();
        return status === 'pending' ? getRouteRequestDemoAdminPending() : [];
      },
      () => this.get<TechnicianRouteRequest[]>('/admin/route-requests', { params: { status } }),
    );
  }

  async approveRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    return mockOrApi(
      () => approveDemoRouteRequest(id, note),
      () => this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/approve`, { note }),
    );
  }

  async rejectRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    return mockOrApi(
      () => rejectDemoRouteRequest(id, note),
      () => this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/reject`, { note }),
    );
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export const sampleCollectionService = new SampleCollectionService();
