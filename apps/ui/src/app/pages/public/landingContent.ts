export const LANDING_ASSETS = {
  logo: '/assets/landing/livotale.png',
  logoSvg: '/assets/landing/livotale.svg',
  livgastroLogo: '/assets/landing/livgastro.png',
  doctorPhoto: '/assets/landing/doctor.jpg',
  doctorBuildingTrust: '/assets/landing/doctor-building-trust.jpg',
  doctorCheckingPatient: '/assets/landing/doctor-checking-patient.jpg',
} as const;

export const LIVGASTRO_PARTNER = {
  name: 'LivGastro',
  url: 'https://livgastro.com/',
  tagline: 'Specialized liver & gastro care in Kolkata',
} as const;

export const CONTACT = {
  phone: '+91 82820 12929',
  email: 'support@livotale.com',
  hours: 'Mon – Sat, 9 AM – 7 PM',
} as const;

export const LANDING_STATS = [
  { value: '10,000+', label: 'Fibrosis scans completed' },
  { value: '98%', label: 'Patient satisfaction' },
  { value: '24h', label: 'Report turnaround' },
  { value: '1+', label: 'Cities covered' },
] as const;

export const LIVER_DISEASES = [
  {
    title: 'Fatty Liver (NAFLD)',
    description:
      'Often silent for years. A fibrosis scan detects stiffness early — before ultrasound or blood tests show damage.',
    severity: 'Very common',
  },
  {
    title: 'Liver Fibrosis',
    description:
      'Scar tissue builds up when the liver heals from repeated injury. FibroScan measures stiffness and stages fibrosis without a biopsy.',
    severity: 'Progressive',
  },
  {
    title: 'Cirrhosis',
    description:
      'Advanced scarring that can lead to liver failure. Early fibrosis screening helps catch progression while it is still reversible.',
    severity: 'Serious',
  },
  {
    title: 'Hepatitis B & C',
    description:
      'Chronic viral hepatitis slowly damages the liver. Regular stiffness monitoring tracks whether treatment is working.',
    severity: 'Chronic risk',
  },
  {
    title: 'Alcoholic Liver Disease',
    description:
      'Years of alcohol use inflames and scars the liver. FibroScan quantifies damage so you can act before symptoms appear.',
    severity: 'Preventable',
  },
  {
    title: 'Liver Cancer Risk',
    description:
      'Long-standing fibrosis and cirrhosis raise hepatocellular carcinoma risk. Early detection of stiffness changes supports timely follow-up.',
    severity: 'Life-threatening',
  },
] as const;

export const FIBROSIS_BENEFITS = [
  {
    title: 'Detect damage before symptoms',
    description:
      'Liver disease is often silent until late stages. FibroScan picks up stiffness years before jaundice, swelling, or fatigue appear.',
  },
  {
    title: 'Non-invasive & painless',
    description:
      'No needles, no biopsy, no hospital admission. A 10-minute scan at your home — the same technology used in top hospitals.',
  },
  {
    title: 'Quantified, actionable results',
    description:
      'Get a kPa stiffness score and CAP fat measurement. Your doctor can stage fibrosis and plan treatment with real numbers.',
  },
  {
    title: 'Track progress over time',
    description:
      'Repeat scans show whether lifestyle changes, medication, or treatment are actually reversing liver damage.',
  },
  {
    title: 'Skip hospital queues',
    description:
      'A certified gastroenterologist visits your home with hospital-grade equipment. No waiting rooms, no day-long visits.',
  },
  {
    title: 'Essential in modern India',
    description:
      'Rising diabetes, obesity, and alcohol use make fatty liver an epidemic. Screening is no longer optional — it is preventive care.',
  },
] as const;

export const HOW_IT_WORKS_SCENES = [
  {
    id: 'scene-1',
    number: '01',
    title: 'The Problem',
    description:
      'Overflowing hospital waiting rooms, long queues, exhausted patients waiting hours just for a basic liver fibrosis test.',
    imageUrl: LANDING_ASSETS.doctorBuildingTrust,
  },
  {
    id: 'scene-2',
    number: '02',
    title: 'The Solution',
    description:
      'A certified gastroenterologist arrives at your door with a FibroScan device — the same equipment used in leading hospitals.',
    quote: 'Now your liver fibrosis scan can come to you.',
    imageUrl:
      'https://images.unsplash.com/photo-1609188076864-c35269136b09?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'scene-3',
    number: '03',
    title: 'FibroScan at Home',
    description:
      'A painless, non-invasive scan measures liver stiffness and fat. No biopsy, no radiation — results in minutes.',
    quote: 'No hospital queues. No painful procedures.',
    imageUrl: LANDING_ASSETS.doctorCheckingPatient,
  },
  {
    id: 'scene-4',
    number: '04',
    title: 'Comfortable Experience',
    description:
      'Relax on your sofa while the specialist performs a quick abdominal scan. Comfortable, private, and stress-free.',
    quote: 'Clinical accuracy from the comfort of your home.',
    imageUrl:
      'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&q=80&auto=format&fit=crop',
  },
  {
    id: 'scene-5',
    number: '05',
    title: 'For Everyone',
    description:
      'Diabetics, professionals with fatty liver risk, elderly patients, or anyone on long-term medications — screening belongs at home.',
    quote: 'Fast, comfortable liver fibrosis screening… from your doorstep.',
    imageUrl:
      'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=1200&q=80&auto=format&fit=crop',
  },
] as const;

export const WHY_LIVOTALE_FEATURES = [
  {
    title: 'At-Home FibroScan',
    description:
      'A certified gastroenterologist brings hospital-grade FibroScan equipment directly to your door.',
  },
  {
    title: 'Results in 24 Hours',
    description:
      'Your stiffness score, CAP fat reading, and specialist interpretation — delivered within a day.',
  },
  {
    title: 'Completely Painless',
    description:
      'No needles, no biopsy, no sedation. A gentle probe on your skin — over in 10 minutes.',
  },
  {
    title: 'Clinical Accuracy',
    description:
      'Same FibroScan technology trusted by hepatologists worldwide for staging liver fibrosis.',
  },
  {
    title: 'Digital Health Record',
    description:
      'All scan results securely stored in your Livotale dashboard, accessible anytime.',
  },
  {
    title: 'Doctor Consultation',
    description:
      'Optional specialist consultation to explain your results and recommend next steps.',
  },
] as const;

export const DOCTOR_PROFILE = {
  name: 'Dr. Vijay Kumar Rai',
  credentials: 'DM · MD · MBBS',
  photo: LANDING_ASSETS.doctorPhoto,
  memberships: [
    'Fellow — American College of Gastroenterology',
    'Fellow — American Society of GI Endoscopy',
    'Member — Indian Society of Gastroenterology',
    'Member — Society of GI Endoscopy of India',
  ],
  procedures: [
    'ERCP (Endoscopic Retrograde Cholangiopancreatography)',
    'EUS (Endoscopic Ultrasound)',
    'Spy Glass & Confocal Laser Endomicroscopy',
    'Gastroduodenoscopy & Colonoscopy — APC, RFA, PEG Tube',
    'Double Balloon & Single Balloon Enteroscopy',
    'Capsule Endoscopy',
    'High Resolution Manometry & Motility Study',
    'Esophageal Stricture Dilatation & Achalasia Management',
  ],
  education: [
    { degree: 'DM — Gastroenterology', institute: 'IPGMER – SSKM Hospital, Kolkata', year: '2012' },
    { degree: 'MD — Internal Medicine', institute: 'Institute of Medical Sciences – BHU, Varanasi', year: '2008' },
    { degree: 'MBBS', institute: 'Institute of Medical Sciences – BHU, Varanasi', year: '2003' },
  ],
  experience: [
    { role: 'Gastroenterologist', place: 'Americana Gastro & Diagnostic Center, Kolkata', period: 'Oct 2020 – Present' },
    { role: 'Gastroenterologist', place: 'Fortis Hospital, Kolkata', period: 'Oct 2020 – Present' },
    { role: 'Consultant Incharge', place: 'Chittaranjan National Cancer Institute, New Town', period: 'Oct 2020 – Present' },
    { role: 'Gastroenterologist', place: 'Apollo Gleneagles Hospitals, Kolkata', period: 'Jan 2013 – Jul 2020' },
    { role: 'Gastroenterologist', place: 'School of Digestive & Liver Disease, Kolkata', period: 'Feb 2009 – Oct 2012' },
  ],
} as const;
