import { BaseApiService } from '@/services/base';
import type {
  AdminSampleCollectionUpdate,
  SampleCollection,
  SampleCollectionConfig,
  SamplePhotoType,
} from '@/types/sampleCollection';
import type { AvailableRouteOrder, TechnicianRouteRequest } from '@/types/routeRequest';
class SampleCollectionService extends BaseApiService {
  async listTechnicianToday(date?: string): Promise<SampleCollection[]> {
    return this.get<SampleCollection[]>('/technician/sample-collections/today', {
          params: date ? { date } : undefined,
        })
  }

  async getTechnicianById(id: string): Promise<SampleCollection> {
    return this.get<SampleCollection>(`/technician/sample-collections/${id}`)
  }

  async getByAppointment(appointmentId: string): Promise<SampleCollection | null> {
    return this.get<SampleCollection | null>(`/technician/sample-collections/by-appointment/${appointmentId}`)
  }

  async technicianAction(id: string, action: string, body: Record<string, unknown> = {}) {
    return this.post<SampleCollection>(`/technician/sample-collections/${id}/${action}`, body)
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
        })
  }

  async handover(id: string, body: Record<string, unknown>) {
    return this.post<SampleCollection>(`/technician/sample-collections/${id}/handover`, body)
  }

  async listAdmin(filters: { status?: string; pincode?: string; limit?: number } = {}) {
    return this.get<SampleCollection[]>('/admin/sample-collections', { params: filters })
  }

  async getAdminById(id: string): Promise<SampleCollection> {
    return this.get<SampleCollection>(`/admin/sample-collections/${id}`)
  }

  async updateAdminDetails(id: string, body: AdminSampleCollectionUpdate): Promise<SampleCollection> {
    return this.patch<SampleCollection>(`/admin/sample-collections/${id}`, body)
  }

  async assignTechnician(id: string, technicianId: string, reason?: string) {
    return this.post<SampleCollection>(`/admin/sample-collections/${id}/assign-technician`, {
          technicianId,
          reason,
        })
  }

  async approveReport(sampleId: string, reportId: string, notes?: string) {
    return this.post<SampleCollection>(`/admin/sample-collections/${sampleId}/reports/${reportId}/approve`, { notes })
  }

  async publishToPatient(id: string) {
    return this.post<SampleCollection>(`/admin/sample-collections/${id}/publish`)
  }

  async getConfig(): Promise<SampleCollectionConfig> {
    return this.get<SampleCollectionConfig>('/admin/sample-collection-config')
  }

  async listAvailableRouteOrders(date?: string): Promise<AvailableRouteOrder[]> {
    const day = date ?? new Date().toISOString().slice(0, 10);
    return this.get<AvailableRouteOrder[]>('/technician/route-requests/available', {
          params: { date: day },
        })
  }

  async listMyRouteRequests(status?: string): Promise<TechnicianRouteRequest[]> {
    return this.get<TechnicianRouteRequest[]>('/technician/route-requests', {
          params: status ? { status } : undefined,
        })
  }

  async requestRoute(sampleCollectionId: string, note?: string): Promise<TechnicianRouteRequest> {
    return this.post<TechnicianRouteRequest>('/technician/route-requests', {
          sampleCollectionId,
          note,
        })
  }

  async listAdminRouteRequests(status = 'pending'): Promise<TechnicianRouteRequest[]> {
    return this.get<TechnicianRouteRequest[]>('/admin/route-requests', { params: { status } })
  }

  async approveRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    return this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/approve`, { note })
  }

  async rejectRouteRequest(id: string, note?: string): Promise<TechnicianRouteRequest> {
    return this.post<TechnicianRouteRequest>(`/admin/route-requests/${id}/reject`, { note })
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
