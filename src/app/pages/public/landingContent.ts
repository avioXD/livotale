export const LANDING_STATS = [
  { value: '10,000+', label: 'Scans completed' },
  { value: '98%', label: 'Patient satisfaction' },
  { value: '24h', label: 'Result turnaround' },
  { value: '1+', label: 'Cities covered' },
] as const;

export const HOW_IT_WORKS_SCENES = [
  {
    id: 'scene-1',
    number: '01',
    title: 'The Problem',
    description: 'Overflowing hospital waiting rooms, long queues, exhausted patients waiting hours just for a basic liver test.',
  },
  {
    id: 'scene-2',
    number: '02',
    title: 'The Solution',
    description: 'Person relaxing at home. A professional gastroenterologist arrives at the door with a medical bag, smiling warmly.',
    quote: 'Now your liver test can come to you.',
  },
  {
    id: 'scene-3',
    number: '03',
    title: 'Liver Ultrasound',
    description: 'A certified specialist performs a painless liver ultrasound scan at your home — the same equipment used in top hospitals.',
    quote: 'No hospital queues.',
  },
  {
    id: 'scene-4',
    number: '04',
    title: 'Comfortable Experience',
    description: 'Patient sits relaxed on their sofa while the specialist gently performs an abdominal scan — comfortable, quick, and stress-free.',
    quote: 'No painful procedures.',
  },
  {
    id: 'scene-5',
    number: '05',
    title: 'For Everyone',
    description: 'Elderly patients, young professionals, busy parents — anyone who needs liver screening without leaving home.',
    quote: 'Just fast, comfortable liver screening… from your home.',
  },
] as const;

export const WHY_LIVOTALE_FEATURES = [
  { icon: '🏠', title: 'At-Home Service', description: 'A certified healthcare professional comes directly to your door with all necessary equipment.' },
  { icon: '⚡', title: 'Fast Results', description: 'Get your liver health report within 24 hours, reviewed by specialist physicians.' },
  { icon: '💆', title: 'Comfortable & Painless', description: 'No needles, no discomfort. Our non-invasive ultrasound-based scan is completely painless.' },
  { icon: '🛡️', title: 'Clinical Accuracy', description: 'Hospital-grade diagnostic accuracy in the comfort of your own home.' },
  { icon: '📱', title: 'Digital Health Record', description: 'All results securely stored in your personal health dashboard, accessible anywhere.' },
  { icon: '🔄', title: 'Follow-up Support', description: 'Post-scan consultation included. Our team guides you through your results and next steps.' },
] as const;

export const DOCTOR_PROFILE = {
  name: 'Dr. Vijay Kumar Rai',
  credentials: 'DM · MD · MBBS',
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
} as const;

export const CONTACT = {
  phone: '+91 82820 12929',
  email: 'support@livotale.com',
} as const;
