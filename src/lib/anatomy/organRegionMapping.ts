/**
 * Maps clinical report regions to organ ids from
 * human-body-organs-mapping-library (MaleSVG / maleData).
 */
export const REGION_ORGAN_IDS: Record<string, string[]> = {
  liver: ['liver'],
  pancreas: ['pancreas'],
  blood: ['heart'],
  kidneys: ['kidney'],
  abdomen: ['stomach', 'colon', 'small intestine'],
};

export function regionKeyForOrganId(organId: string): string | null {
  for (const [regionKey, organIds] of Object.entries(REGION_ORGAN_IDS)) {
    if (organIds.includes(organId)) return regionKey;
  }
  return null;
}

export function organIdsForRegionKey(regionKey: string): string[] {
  return REGION_ORGAN_IDS[regionKey] ?? [];
}
