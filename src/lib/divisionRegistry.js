import { Bug, Flame, SprayCan, KeyRound, Building2 } from 'lucide-react'

/**
 * Division metadata — the single source of truth for client-side division config.
 * Per-division data (job types, products, assessment schemas) lives in the database
 * (populated from seed migrations); this file only holds UI/theme/labels.
 */
export const DIVISIONS = {
  pest: {
    slug: 'pest',
    name: 'Pest Control',
    name_short: 'Pest',
    full_name: 'A Wilkinson Pest Control',
    abbrev: 'AWPC',
    tagline: 'Professional pest management',
    icon: Bug,
    theme_class: 'theme-pest',
    tw_color: 'pest',
    brand_hex: '#16a34a',
    terminology: {
      site: 'Premises',
      site_plural: 'Premises',
      job: 'Treatment',
      job_plural: 'Treatments',
      report: 'Treatment Report',
      assessment: 'Infestation Assessment',
    },
    regulations: {
      cert_body: 'BPCA',
      key_standards: ['CRRU UK Code', 'COSHH 2002', 'HSE Approval'],
    },
  },
  fire: {
    slug: 'fire',
    name: 'Fire Safety',
    name_short: 'Fire',
    full_name: 'A Wilkinson Fire Safety',
    abbrev: 'AWFS',
    tagline: 'Compliance, assessments & servicing',
    icon: Flame,
    theme_class: 'theme-fire',
    tw_color: 'fire',
    brand_hex: '#dc2626',
    terminology: {
      site: 'Building',
      site_plural: 'Buildings',
      job: 'Service',
      job_plural: 'Services',
      report: 'Service Report',
      assessment: 'Fire Risk Assessment',
    },
    regulations: {
      cert_body: 'BAFE',
      key_standards: ['RRO 2005', 'BS 5839', 'BS 9999', 'BAFE SP101/SP203'],
    },
  },
  hygiene: {
    slug: 'hygiene',
    name: 'Hygiene Services',
    name_short: 'Hygiene',
    full_name: 'A Wilkinson Hygiene Services',
    abbrev: 'AWHS',
    tagline: 'Deep clean & sanitisation',
    icon: SprayCan,
    theme_class: 'theme-hygiene',
    tw_color: 'hygiene',
    brand_hex: '#0891b2',
    terminology: {
      site: 'Site',
      site_plural: 'Sites',
      job: 'Clean',
      job_plural: 'Cleans',
      report: 'Clean Report',
      assessment: 'Hygiene Audit',
    },
    regulations: {
      cert_body: 'BICSc',
      key_standards: ['BICSc Standards', 'Food Safety Act 1990', 'COSHH', 'ISO 9001'],
    },
  },
  locksmith: {
    slug: 'locksmith',
    name: 'Locksmith',
    name_short: 'Locks',
    full_name: 'A Wilkinson Locksmith',
    abbrev: 'AWL',
    tagline: 'Security & access solutions',
    icon: KeyRound,
    theme_class: 'theme-locksmith',
    tw_color: 'locksmith',
    brand_hex: '#d97706',
    terminology: {
      site: 'Location',
      site_plural: 'Locations',
      job: 'Job',
      job_plural: 'Jobs',
      report: 'Job Report',
      assessment: 'Security Survey',
    },
    regulations: {
      cert_body: 'MLA',
      key_standards: ['MLA Approved', 'BS 3621', 'BS 8621', 'DBS Checked'],
    },
  },
  // Group view — AWC parent
  awc: {
    slug: 'awc',
    name: 'Group',
    name_short: 'Group',
    full_name: 'A Wilkinson Company Ltd',
    abbrev: 'AWC',
    tagline: 'All divisions',
    icon: Building2,
    theme_class: 'theme-awc',
    tw_color: 'awc',
    brand_hex: '#1e2836',
    terminology: {
      site: 'Location',
      site_plural: 'Locations',
      job: 'Job',
      job_plural: 'Jobs',
      report: 'Report',
      assessment: 'Assessment',
    },
    regulations: { cert_body: 'AWC Group', key_standards: [] },
  },
}

export const DIVISION_SLUGS = ['pest', 'fire', 'hygiene', 'locksmith']
export const ALL_THEME_CLASSES = ['theme-pest', 'theme-fire', 'theme-hygiene', 'theme-locksmith', 'theme-awc']

export function getDivision(slug) {
  return DIVISIONS[slug] ?? null
}
