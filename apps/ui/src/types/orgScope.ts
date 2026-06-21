/** Organization is city + pincode scoped — used for ops assignment and data filtering. */
export interface OrgCity {
  id: string;
  name: string;
  state: string;
  /** Primary pincodes serviced in this city. */
  pincodes: string[];
}

export interface OrgScope {
  cityId: string | null;
  cityName: string | null;
  /** Pincodes this user or record is scoped to (empty = all in city). */
  pincodes: string[];
}

export const DEMO_ORG_CITIES: OrgCity[] = [
  {
    id: 'city-mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    pincodes: ['400001', '400013', '400028', '400050', '400069'],
  },
  {
    id: 'city-bangalore',
    name: 'Bangalore',
    state: 'Karnataka',
    pincodes: ['560001', '560095', '560034'],
  },
];

export function formatOrgScope(scope: Pick<OrgScope, 'cityName' | 'pincodes'>): string {
  if (!scope.cityName) return 'All cities';
  if (scope.pincodes.length === 0) return scope.cityName;
  return `${scope.cityName} · ${scope.pincodes.length} pincode(s)`;
}

export function parsePincodesInput(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
