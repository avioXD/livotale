import { BaseApiService } from '@/services/base';
import {
  evaluatePincode,
  type CreateServiceZoneInput,
  type PincodeServiceability,
  type ServiceZone,
  type UpdateServiceZoneInput,
} from '@/types/serviceZone';

const BASE = '/admin/service-zones';

class ServiceZoneService extends BaseApiService {
  async list(): Promise<ServiceZone[]> {
    return this.get<ServiceZone[]>(BASE)
  }

  async getById(id: string): Promise<ServiceZone | null> {
    return this.get<ServiceZone>(`${BASE}/${id}`)
  }

  async create(input: CreateServiceZoneInput): Promise<ServiceZone> {
    return this.post<ServiceZone>(BASE, input)
  }

  async update(id: string, patch: UpdateServiceZoneInput): Promise<ServiceZone> {
    return this.patch<ServiceZone>(`${BASE}/${id}`, patch)
  }

  async setActive(id: string, active: boolean): Promise<ServiceZone> {
    return this.update(id, { active });
  }

  async remove(id: string): Promise<void> {
    return this.delete<void>(`${BASE}/${id}`)
  }

  /** Validation logic — check a single pincode against current zones. */
  async validatePincode(pincode: string): Promise<PincodeServiceability> {
    const zones = await this.list();
    return evaluatePincode(zones, pincode);
  }
}

export const serviceZoneService = new ServiceZoneService();
