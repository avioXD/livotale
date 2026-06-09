/** Single line in a checklist section (included ✓ or not included ✗) */
export interface PackageChecklistItem {
  id: string;
  label: string;
  included: boolean;
  detail?: string | null;
}

/** Grouped checklist — e.g. "Scan & imaging", "Blood tests", "Consultation" */
export interface PackageChecklistSection {
  id: string;
  title: string;
  items: PackageChecklistItem[];
}

export interface PackageHighlight {
  label: string;
  value: string;
}

export type BloodCollectionTiming = 'before_scan' | 'after_scan';

export interface PackageFaq {
  question: string;
  answer: string;
}

/** @deprecated Prefer checklistSections — kept for backward compat */
export interface PackageIncludes {
  bullets: string[];
}

/** Organ-category test breakdown for public pathology panels */
export interface PackageTestCategory {
  id: string;
  name: string;
  tests: string[];
}

export interface LiverCarePackage {
  id: string;
  code: string;
  name: string;
  /** One-line card subtitle */
  subtitle?: string | null;
  description: string;
  /** Marketing tagline on detail page */
  tagline?: string | null;
  price: number;
  discountPrice?: number | null;
  includes: PackageIncludes;
  /** Three fixed checklist sections — inclusion toggled via workflow flags */
  checklistSections: PackageChecklistSection[];
  /** Quick facts row: TAT, fasting, sample type, etc. */
  highlights: PackageHighlight[];
  preparation: string[];
  whoShouldBook: string[];
  faqs: PackageFaq[];
  fibrosisScanIncluded: boolean;
  pathologyIncluded: boolean;
  consultationIncluded: boolean;
  /** When technician should collect blood relative to fibrosis scan on the same visit. */
  bloodCollectionTiming?: BloodCollectionTiming | null;
  visibilityWeb: boolean;
  active: boolean;
  sortOrder: number;
  termsConditions?: string;
  recommendedTag?: boolean;
  testCountTotal?: number | null;
  testCategories?: PackageTestCategory[];
  createdAt: string;
  updatedAt: string;
}

export type CreatePackageInput = Omit<LiverCarePackage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePackageInput = Partial<CreatePackageInput>;
