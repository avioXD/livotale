import { BaseApiService } from '@/services/base';
import type {
  AdminSampleCollectionUpdate,
  SampleCollection,
  SampleCollectionConfig,
  SamplePhotoType,
  SampleRejectionReason,
} from '@/types/sampleCollection';
import type { AvailableRouteOrder, TechnicianRouteRequest } from '@/types/routeRequest';
import {
  getAdminDemoSampleById,
  listAdminDemoSamples,
  updateAdminDemoSample,
} from '@/data/adminSampleDemoData';
import {
  getLabDemoSampleById,
  isApiUnavailableError,
  LAB_DEMO_SAMPLES,
} from '@/data/labSampleDemoData';
import {
  approveDemoRouteRequest,
  createDemoRouteRequest,
  getRouteRequestDemoAdminPending,
  getRouteRequestDemoMyRequests,
  getRouteRequestDemoOrders,
  isRouteRequestDemoId,
  markRouteRequestDemoActive,
  rejectDemoRouteRequest,
} from '@/data/routeRequestDemoData';

class SampleCollectionService extends BaseApiService {
  async listTechnicianToday(date?: string): Promise<SampleCollection[]> {
    return this.get<SampleCollection[]>('/technician/sample-collections/today', {
      params: date ? { date } : undefined,
    });
  }

  async getTechnicianById(id: string): Promise<SampleCollection> {
    return this.get<SampleCollection>(`/technician/sample-collections/${id}`);
  }

  async getByAppointment(appointmentId: string): Promise<SampleCollection | null> {
    return this.get<SampleCollection | null>(`/technician/sample-collections/by-appointment/${appointmentId}`);
  }

  async technicianAction(id: string, action: string, body: Record<string, unknown> = {}) {
    return this.post<SampleCollection>(`/technician/sample-collections/${id}/${action}`, body);
  }

  async uploadPhoto(
    id: string,
    file: File,
    geo?: { latitude: number; longitude: number },
    photoType: SamplePhotoType = 'container_label',
  ) {
    const storageUrl = await this.fileToDataUrl(file);
    return this.post<SampleCollection>(`/technician/sample-collections/${id}/photo`, {
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      storageUrl,
      photoType,
      latitude: geo?.latitude,
      longitude: geo?.longitude,
    });
  }

  async uploadLabPhoto(
    id: string,
    file: File,
    photoType: SamplePhotoType = 'lab_bottle_verification',
  ) {
    const storageUrl = await this.fileToDataUrl(file);
    return this.post<SampleCollection>(`/lab/sample-collections/${id}/photo`, {
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      storageUrl,
      photoType,
    });
  }

  async updateLabResults(
    id: string,
    results: Array<{
      labTestId: string;
      resultValue?: number | string | null;
      resultText?: string | null;
    }>,
  ) {
    return this.post<SampleCollection>(`/lab/sample-collections/${id}/results`, { results });
  }

  async generateLabReport(id: string) {
    return this.post<{ report: Record<string, unknown>; sampleCollection: SampleCollection }>(
      `/lab/sample-collections/${id}/reports/generate`,
      {},
    );
  }

  async handover(id: string, body: Record<string, unknown>) {
    return this.post<SampleCollection>(`/technician/sample-collections/${id}/handover`, body);
  }

  async listLab(status?: string): Promise<SampleCollection[]> {
    try {
      return await this.get<SampleCollection[]>('/lab/sample-collections', { params: status ? { status } : undefined });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return LAB_DEMO_SAMPLES;
      }
      throw err;
    }
  }

  async getLabById(id: string): Promise<SampleCollection> {
    try {
      return await this.get<SampleCollection>(`/lab/sample-collections/${id}`);
    } catch (err) {
      const demo = getLabDemoSampleById(id);
      if (isApiUnavailableError(err) && demo) return demo;
      if (isApiUnavailableError(err) && LAB_DEMO_SAMPLES[0]) return LAB_DEMO_SAMPLES[0];
      throw err;
    }
  }

  async receiveLab(id: string, remarks?: string) {
    return this.post<SampleCollection>(`/lab/sample-collections/${id}/receive`, { remarks });
  }

  async rejectLab(id: string, reasonCode: SampleRejectionReason, remarks?: string) {
    return this.post<SampleCollection>(`/lab/sample-collections/${id}/reject`, { reasonCode, remarks });
  }

  async startTesting(id: string) {
    return this.post<SampleCollection>(`/lab/sample-collections/${id}/start-testing`);
  }

  async uploadReport(id: string, body: Record<string, unknown>) {
    return this.post<{ report: Record<string, unknown>; sampleCollection: SampleCollection }>(
      `/lab/sample-collections/${id}/reports`,
      body,
    );
  }

  async listAdmin(filters: { status?: string; pincode?: string; limit?: number } = {}) {
    try {
      return await this.get<SampleCollection[]>('/admin/sample-collections', { params: filters });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return listAdminDemoSamples({ status: filters.status });
      }
      throw err;
    }
  }

  async getAdminById(id: string): Promise<SampleCollection> {
    try {
      return await this.get<SampleCollection>(`/admin/sample-collections/${id}`);
    } catch (err) {
      const demo = getAdminDemoSampleById(id);
      if (isApiUnavailableError(err) && demo) return demo;
      if (isApiUnavailableError(err)) {
        const list = listAdminDemoSamples();
        if (list[0]) return list[0];
      }
      throw err;
    }
  }

  async updateAdminDetails(id: string, body: AdminSampleCollectionUpdate): Promise<SampleCollection> {
    try {
      return await this.patch<SampleCollection>(`/admin/sample-collections/${id}`, body);
    } catch (err) {
      if (isApiUnavailableError(err)) {
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
        if (updated) return updated;
      }
      throw err;
    }
  }

  async assignTechnician(id: string, technicianId: string, reason?: string) {
    try {
      return await this.post<SampleCollection>(`/admin/sample-collections/${id}/assign-technician`, {
        technicianId,
        reason,
      });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        const existing = getAdminDemoSampleById(id);
        if (existing) {
          return updateAdminDemoSample(id, {
            technicianId,
            technicianName: 'Assigned (demo)',
            status: 'assigned',
            assignedAt: new Date().toISOString(),
          })!;
        }
      }
      throw err;
    }
  }

  async approveReport(sampleId: string, reportId: string, notes?: string) {
    return this.post<SampleCollection>(`/admin/sample-collections/${sampleId}/reports/${reportId}/approve`, { notes });
  }

  async publishToPatient(id: string) {
    return this.post<SampleCollection>(`/admin/sample-collections/${id}/publish`);
  }

  async getConfig(): Promise<SampleCollectionConfig> {
    return this.get<SampleCollectionConfig>('/admin/sample-collection-config');
  }

  async listAvailableRouteOrders(date?: string): Promise<AvailableRouteOrder[]> {
    const day = date ?? new Date().toISOString().slice(0, 10);
    try {
      return await this.get<AvailableRouteOrder[]>('/technician/route-requests/available', {
        params: { date: day },
      });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        markRouteRequestDemoActive();
        return getRouteRequestDemoOrders(day);
      }
      throw err;
    }
  }

  async listMyRouteRequests(status?: string): Promise<TechnicianRouteRequest[]> {
    try {
      return await this.get<TechnicianRouteRequest[]>('/technician/route-requests', {
        params: status ? { status } : undefined,
      });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        markRouteRequestDemoActive();
        const mine = getRouteRequestDemoMyRequests();
        return status ? mine.filter((r) => r.status === status) : mine;
      }
      throw err;
    }
  }

  async requestRoute(sampleCollectionId: string, note?: string): Promise<TechnicianRouteRequest> {
    if (isRouteRequestDemoId(sampleCollectionId)) {
      return createDemoRouteRequest(sampleCollectionId, note);
    }
    try {
      return await this.post<TechnicianRouteRequest>('/technician/route-requests', {
        sampleCollectionId,
        note,
      });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return createDemoRouteRequest(sampleCollectionId, note);
      }
      throw err;
    }
  }

  async listAdminRouteRequests(status = 'pending'): Promise<TechnicianRouteRequest[]> {
    try {
      return await this.get<TechnicianRouteRequest[]>('/admin/route-requests', { params: { status } });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        markRouteRequestDemoActive();
        return status === 'pending' ? getRouteRequestDemoAdminPending() : [];
      }
      throw err;
    }
  }

  async approveRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    if (isRouteRequestDemoId(id)) {
      return approveDemoRouteRequest(id, note);
    }
    try {
      return await this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/approve`, { note });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return approveDemoRouteRequest(id, note);
      }
      throw err;
    }
  }

  async rejectRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    if (isRouteRequestDemoId(id)) {
      return rejectDemoRouteRequest(id, note);
    }
    try {
      return await this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/reject`, { note });
    } catch (err) {
      if (isApiUnavailableError(err)) {
        return rejectDemoRouteRequest(id, note);
      }
      throw err;
    }
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
