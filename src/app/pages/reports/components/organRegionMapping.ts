export {
  REGION_ORGAN_IDS as REGION_UBERON_IDS,
  organIdsForRegionKey,
  regionKeyForOrganId as regionKeyForUberonId,
} from '@/lib/anatomy/organRegionMapping';

/** @deprecated Kept for backwards compatibility — Innoplexus map does not use UBERON ids. */
export const CONTEXT_UBERON_IDS: string[] = [];

/** @deprecated Kept for backwards compatibility — Innoplexus map uses overlay colors instead. */
export const BASE_ORGAN_STYLES: Record<string, { fill: string; stroke: string }> = {};
