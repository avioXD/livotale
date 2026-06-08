import type { LiverCarePackage } from '@/types/package';
import { bulletsFromSections, defaultChecklistSections, defaultHighlights } from './package.utils';

const days = (n: number, base = Date.now()) => new Date(base - n * 86400000).toISOString();
const seededAt = days(30);

function seedPkg(
  partial: Omit<LiverCarePackage, 'checklistSections' | 'highlights' | 'preparation' | 'whoShouldBook' | 'faqs' | 'subtitle' | 'tagline'> & {
    subtitle: string;
    tagline: string;
    preparation: string[];
    whoShouldBook: string[];
    faqs: LiverCarePackage['faqs'];
    checklistSections?: LiverCarePackage['checklistSections'];
    highlights?: LiverCarePackage['highlights'];
  },
): LiverCarePackage {
  const flags = {
    fibrosisScanIncluded: partial.fibrosisScanIncluded,
    pathologyIncluded: partial.pathologyIncluded,
    consultationIncluded: partial.consultationIncluded,
  };
  const checklistSections = partial.checklistSections ?? defaultChecklistSections(flags);
  return {
    ...partial,
    checklistSections,
    highlights: partial.highlights ?? defaultHighlights(flags),
    includes: { bullets: bulletsFromSections(checklistSections) },
  };
}

export function buildSeedPackages(): LiverCarePackage[] {
  return [
    seedPkg({
      id: 'pkg-1',
      code: 'PKG-1',
      name: 'Liver Fibrosis Scan',
      subtitle: 'Essential liver stiffness assessment at home',
      tagline: 'Know your liver health in one painless visit',
      description: 'Non-invasive liver stiffness measurement (LSM, CAP, F-stage) with a technician home visit and digital report.',
      price: 5500,
      discountPrice: null,
      includes: { bullets: [] },
      fibrosisScanIncluded: true,
      pathologyIncluded: false,
      consultationIncluded: false,
      visibilityWeb: true,
      active: true,
      sortOrder: 1,
      termsConditions: 'Fasting 3 hours recommended. Results in 24–48 hours. Home visit within serviceable pin codes.',
      recommendedTag: false,
      createdAt: seededAt,
      updatedAt: seededAt,
      preparation: [
        'Fast for 3 hours before the scan (water is allowed)',
        'Wear loose clothing for abdomen access',
        'Keep previous liver reports handy if available',
      ],
      whoShouldBook: [
        'Adults with fatty liver or metabolic concerns',
        'Patients on long-term medications affecting the liver',
        'Anyone wanting a baseline fibrosis assessment without blood tests',
      ],
      faqs: [
        { question: 'Is the scan painful?', answer: 'No. Liver Fibrosis Scan is non-invasive — similar to an ultrasound with no needles.' },
        { question: 'How long does the visit take?', answer: 'The technician visit typically takes 20–30 minutes including setup and scan.' },
        { question: 'When will I get my report?', answer: 'Digital report is delivered within 24–48 hours on the patient portal.' },
      ],
    }),
    seedPkg({
      id: 'pkg-2',
      code: 'PKG-2',
      name: 'Liver Fibrosis Scan + Pathological Test',
      subtitle: 'Scan plus comprehensive blood panel',
      tagline: 'Complete liver picture — imaging and lab together',
      description: 'Full liver assessment combining fibrosis scan with partner-lab pathology and a merged Livotale final report.',
      price: 8000,
      discountPrice: 7500,
      includes: { bullets: [] },
      fibrosisScanIncluded: true,
      pathologyIncluded: true,
      consultationIncluded: false,
      visibilityWeb: true,
      active: true,
      sortOrder: 2,
      termsConditions: 'Includes home blood sample collection. Combined report within 5–7 business days after lab processing.',
      recommendedTag: true,
      createdAt: seededAt,
      updatedAt: seededAt,
      preparation: [
        'Fast for 8–10 hours before blood sample collection',
        'Scan can be done same day — technician will coordinate timing',
        'Stay well hydrated except during fasting window',
      ],
      whoShouldBook: [
        'Patients needing both structural and biochemical liver assessment',
        'Those with elevated liver enzymes wanting fibrosis staging',
        'Follow-up after lifestyle changes or medication',
      ],
      faqs: [
        { question: 'Who processes the blood tests?', answer: 'Samples are sent to our partner NABL-accredited lab. Reports are merged into your Livotale final letterhead PDF.' },
        { question: 'Can I do scan and blood test on different days?', answer: 'Yes — ops will coordinate if you prefer separate visits.' },
      ],
    }),
    seedPkg({
      id: 'pkg-3',
      code: 'PKG-3',
      name: 'Liver Fibrosis Scan + Pathological Test + Doctor Consultation',
      subtitle: 'Full care pathway with specialist review',
      tagline: 'Scan, labs, and expert guidance in one package',
      description: 'End-to-end liver care: home scan, pathology panel, merged report, 20-minute specialist video consultation, and digital prescription.',
      price: 9500,
      discountPrice: null,
      includes: { bullets: [] },
      fibrosisScanIncluded: true,
      pathologyIncluded: true,
      consultationIncluded: true,
      visibilityWeb: true,
      active: true,
      sortOrder: 3,
      termsConditions: 'Consultation scheduled after reports are ready. Prescription published to patient portal within 24 hours of consult.',
      recommendedTag: false,
      createdAt: seededAt,
      updatedAt: seededAt,
      preparation: [
        'Complete fasting as advised for blood collection',
        'Ensure stable internet for video consultation',
        'List current medications and questions for the doctor',
      ],
      whoShouldBook: [
        'Patients wanting expert interpretation of scan and lab results',
        'Those starting or adjusting liver-related treatment',
        'Anyone preferring a single guided care pathway',
      ],
      faqs: [
        { question: 'When is the doctor consultation scheduled?', answer: 'After your final merged report is ready — typically 5–7 business days from sample collection.' },
        { question: 'Will I get a prescription?', answer: 'Yes, if clinically indicated. Digital prescription is available on the patient portal.' },
      ],
    }),
  ];
}
