import type {
  LiverCarePackage,
  PackageChecklistItem,
  PackageChecklistSection,
  PackageHighlight,
} from '@/types/package';

export const SECTION_SCAN = 'cs-scan';
export const SECTION_PATHOLOGY = 'cs-pathology';
export const SECTION_CONSULT = 'cs-consult';

export const ALWAYS_INCLUDED_DELIVERY_ITEMS = [
  'Livotale letterhead final report',
  'Patient portal download',
  'WhatsApp report notification',
] as const;

export type PackageWorkflowFlags = Pick<
  LiverCarePackage,
  'fibrosisScanIncluded' | 'pathologyIncluded' | 'consultationIncluded'
>;

interface FixedSectionDef {
  id: string;
  title: string;
  flag: keyof PackageWorkflowFlags;
  items: { id: string; label: string }[];
}

const FIXED_CHECKLIST_SECTION_DEFS: FixedSectionDef[] = [
  {
    id: SECTION_SCAN,
    title: 'Fibrosis scan & imaging',
    flag: 'fibrosisScanIncluded',
    items: [
      { id: 'ci-scan-lsm', label: 'Liver Fibrosis Scan (LSM, CAP, F-stage)' },
      { id: 'ci-scan-visit', label: 'Technician home visit' },
      { id: 'ci-scan-report', label: 'Scan interpretation in final report' },
    ],
  },
  {
    id: SECTION_PATHOLOGY,
    title: 'Blood tests & pathology',
    flag: 'pathologyIncluded',
    items: [
      { id: 'ci-path-lft', label: 'Liver function panel (SGOT, SGPT, bilirubin)' },
      { id: 'ci-path-cbc', label: 'Complete blood count' },
      { id: 'ci-path-viral', label: 'Viral markers (HBsAg, Anti-HCV)' },
      { id: 'ci-path-lab', label: 'Lab partner processing' },
      { id: 'ci-path-ai', label: 'AI-assisted report merge' },
    ],
  },
  {
    id: SECTION_CONSULT,
    title: 'Doctor consultation',
    flag: 'consultationIncluded',
    items: [
      { id: 'ci-consult-video', label: 'Specialist video consultation' },
      { id: 'ci-consult-review', label: 'Review of scan + pathology' },
      { id: 'ci-consult-rx', label: 'Digital prescription' },
    ],
  },
];

export function nextPackageCode(existing: LiverCarePackage[]): string {
  const nums = existing
    .map((p) => /^PKG-(\d+)$/i.exec(p.code)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `PKG-${next}`;
}

function checklistItem(id: string, label: string, included: boolean): PackageChecklistItem {
  return { id, label, included, detail: null };
}

export function defaultHighlights(pkg: PackageWorkflowFlags): PackageHighlight[] {
  const highlights: PackageHighlight[] = [
    { label: 'Visit type', value: 'Home visit' },
    { label: 'Report delivery', value: 'Digital PDF' },
  ];
  if (pkg.pathologyIncluded) {
    highlights.push({ label: 'Sample', value: 'Blood — home collection' });
    highlights.push({ label: 'Turnaround', value: '5–7 business days' });
  } else {
    highlights.push({ label: 'Turnaround', value: '24–48 hours' });
  }
  if (pkg.consultationIncluded) {
    highlights.push({ label: 'Doctor consult', value: 'Video — 20 min' });
  }
  return highlights;
}

/** Always returns exactly three fixed sections; item inclusion follows workflow flags. */
export function defaultChecklistSections(pkg: PackageWorkflowFlags): PackageChecklistSection[] {
  return FIXED_CHECKLIST_SECTION_DEFS.map((def) => {
    const included = pkg[def.flag];
    return {
      id: def.id,
      title: def.title,
      items: def.items.map((item) => checklistItem(item.id, item.label, included)),
    };
  });
}

export function flagsFromChecklistSections(sections: PackageChecklistSection[]): PackageWorkflowFlags {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const sectionIncluded = (id: string) => byId.get(id)?.items.some((i) => i.included) ?? false;
  return {
    fibrosisScanIncluded: sectionIncluded(SECTION_SCAN),
    pathologyIncluded: sectionIncluded(SECTION_PATHOLOGY),
    consultationIncluded: sectionIncluded(SECTION_CONSULT),
  };
}

export function syncPackageFromFlags(
  flags: PackageWorkflowFlags,
): Pick<CreatePackageDraft, keyof PackageWorkflowFlags | 'checklistSections' | 'includes' | 'highlights'> {
  const checklistSections = defaultChecklistSections(flags);
  return {
    ...flags,
    checklistSections,
    includes: { bullets: bulletsFromSections(checklistSections) },
    highlights: defaultHighlights(flags),
  };
}

/** Flat included bullets for cards / legacy includes */
export function bulletsFromSections(sections: PackageChecklistSection[]): string[] {
  const fromSections = sections.flatMap((s) => s.items.filter((i) => i.included).map((i) => i.label));
  return [...fromSections, ...ALWAYS_INCLUDED_DELIVERY_ITEMS];
}

export function normalizePackageDraft(draft: CreatePackageDraft): CreatePackageDraft {
  const flags: PackageWorkflowFlags = {
    fibrosisScanIncluded: draft.fibrosisScanIncluded,
    pathologyIncluded: draft.pathologyIncluded,
    consultationIncluded: draft.consultationIncluded,
  };
  const synced = syncPackageFromFlags(flags, draft);
  return {
    ...draft,
    ...synced,
    name: draft.name.trim(),
    description: draft.description.trim(),
    subtitle: draft.subtitle?.trim() || null,
    tagline: draft.tagline?.trim() || null,
  };
}

export function emptyPackageDraft(existing: LiverCarePackage[]): CreatePackageDraft {
  const flags = { fibrosisScanIncluded: true, pathologyIncluded: false, consultationIncluded: false };
  const sections = defaultChecklistSections(flags);
  return {
    code: nextPackageCode(existing),
    name: '',
    subtitle: '',
    description: '',
    tagline: '',
    price: 5500,
    discountPrice: null,
    includes: { bullets: bulletsFromSections(sections) },
    checklistSections: sections,
    highlights: defaultHighlights(flags),
    preparation: ['Fast for 3 hours before scan', 'Stay hydrated — water allowed'],
    whoShouldBook: ['Adults with fatty liver concerns', 'Patients on long-term medications affecting liver'],
    faqs: [
      { question: 'Is the scan painful?', answer: 'No — Liver Fibrosis Scan is non-invasive and painless, similar to an ultrasound.' },
    ],
    fibrosisScanIncluded: true,
    pathologyIncluded: false,
    consultationIncluded: false,
    visibilityWeb: true,
    active: true,
    sortOrder: existing.length + 1,
    termsConditions: '',
    recommendedTag: false,
  };
}

export interface CreatePackageDraft extends Omit<LiverCarePackage, 'id' | 'createdAt' | 'updatedAt'> {}
