/**
 * Service zone — the org's single source of truth for which city + pincodes are
 * serviceable. Used as the main filter logic (scope lists by city) and validation
 * logic (block bookings / assignments outside serviced pincodes). Super Admin controlled.
 */
export interface ServiceZone {
  id: string;
  city: string;
  state: string;
  /** Pincodes serviced within this city. */
  pincodes: string[];
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceZoneInput {
  city: string;
  state: string;
  pincodes: string[];
  active: boolean;
  notes?: string | null;
}

export type UpdateServiceZoneInput = Partial<CreateServiceZoneInput>;

export interface PincodeServiceability {
  serviceable: boolean;
  zone: ServiceZone | null;
  reason: 'serviceable' | 'pincode_not_covered' | 'city_inactive' | 'empty';
}

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, '').trim();
}

export function parsePincodeList(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(/[\s,]+/)) {
    const pin = normalizePincode(raw);
    if (pin) seen.add(pin);
  }
  return [...seen];
}

/** Validation logic: is a pincode serviceable across all active zones? */
export function evaluatePincode(zones: ServiceZone[], pincode: string): PincodeServiceability {
  const pin = normalizePincode(pincode);
  if (!pin) return { serviceable: false, zone: null, reason: 'empty' };

  const matchingZone = zones.find((z) => z.pincodes.includes(pin));
  if (!matchingZone) return { serviceable: false, zone: null, reason: 'pincode_not_covered' };
  if (!matchingZone.active) return { serviceable: false, zone: matchingZone, reason: 'city_inactive' };
  return { serviceable: true, zone: matchingZone, reason: 'serviceable' };
}

/** Filter logic: distinct active cities, sorted. */
export function activeCities(zones: ServiceZone[]): ServiceZone[] {
  return zones.filter((z) => z.active).sort((a, b) => a.city.localeCompare(b.city));
}

/** Flatten all serviced pincodes from active zones. */
export function servicedPincodes(zones: ServiceZone[]): string[] {
  return [...new Set(zones.filter((z) => z.active).flatMap((z) => z.pincodes))].sort((a, b) => a.localeCompare(b));
}
