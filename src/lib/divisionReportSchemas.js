/**
 * Division-specific report field definitions.
 * Each entry in `fields` is rendered by DynamicField.jsx.
 *
 * Supported field types:
 *   text        — single-line
 *   textarea    — multi-line
 *   number      — numeric input
 *   boolean     — checkbox
 *   select      — single-choice dropdown
 *   multiselect — checkbox grid
 *
 * Each field value is stored in job_reports.report_data under its `key`.
 */
export const DIVISION_REPORT_SCHEMAS = {
  pest: {
    heading: 'Treatment record',
    fields: [
      { key: 'target_species', label: 'Target species', type: 'multiselect',
        options: ['brown_rat', 'house_mouse', 'cockroach', 'ant', 'bedbug', 'wasp', 'flea', 'moth', 'silverfish', 'other'] },
      { key: 'infestation_level', label: 'Infestation level', type: 'select',
        options: ['none', 'low', 'moderate', 'heavy', 'severe'] },
      { key: 'stations_count', label: 'Bait stations serviced', type: 'number', min: 0 },
      { key: 'bait_used', label: 'Bait / product used', type: 'text',
        placeholder: 'e.g. Brodifacoum wax blocks × 6' },
      { key: 'harbourage_found', label: 'Harbourage located', type: 'boolean' },
      { key: 'proofing_recommended', label: 'Proofing recommended', type: 'multiselect',
        options: ['door_sweeps', 'air_brick_mesh', 'pipe_sealing', 'roof_repairs'] },
      { key: 'crru_notes', label: 'CRRU compliance notes', type: 'textarea' },
    ],
  },

  fire: {
    heading: 'Service record',
    fields: [
      { key: 'extinguishers_checked', label: 'Extinguishers checked', type: 'number', min: 0 },
      { key: 'extinguishers_serviced', label: 'Extinguishers serviced', type: 'number', min: 0 },
      { key: 'alarm_tested', label: 'Fire alarm fully tested', type: 'boolean' },
      { key: 'emergency_lighting_ok', label: 'Emergency lighting OK', type: 'boolean' },
      { key: 'fire_doors_checked', label: 'Fire doors checked', type: 'number', min: 0 },
      { key: 'risk_rating', label: 'Overall risk rating', type: 'select',
        options: ['trivial', 'tolerable', 'moderate', 'substantial', 'intolerable'] },
      { key: 'defects', label: 'Defects / recommendations', type: 'textarea',
        placeholder: 'Location · defect · priority · action required' },
    ],
  },

  hygiene: {
    heading: 'Clean report',
    fields: [
      { key: 'areas_cleaned', label: 'Areas cleaned', type: 'multiselect',
        options: ['reception', 'offices', 'meeting_rooms', 'toilets', 'kitchen', 'dining', 'warehouse', 'production', 'external'] },
      { key: 'touchpoints_sanitised', label: 'Touchpoints sanitised', type: 'number', min: 0 },
      { key: 'consumables_restocked', label: 'Consumables restocked', type: 'boolean' },
      { key: 'atp_pass', label: 'ATP audit — all zones pass', type: 'boolean' },
      { key: 'issues_reported', label: 'Issues noted', type: 'textarea',
        placeholder: 'Any concerns for the client' },
    ],
  },

  locksmith: {
    heading: 'Work record',
    fields: [
      { key: 'work_performed', label: 'Work performed', type: 'text',
        placeholder: 'e.g. Yale 5-lever upgrade, front door' },
      { key: 'locks_installed', label: 'Locks installed / replaced', type: 'number', min: 0 },
      { key: 'keys_cut', label: 'Keys cut', type: 'number', min: 0 },
      { key: 'british_standard', label: 'BS 3621 insurance-compliant', type: 'boolean' },
      { key: 'master_keyed', label: 'Master-key system affected', type: 'boolean' },
      { key: 'forced_entry', label: 'Forced-entry evidence', type: 'boolean' },
      { key: 'security_notes', label: 'Security survey notes', type: 'textarea',
        placeholder: 'Weak points, recommended upgrades' },
    ],
  },
}

export function getReportSchema(slug) {
  return DIVISION_REPORT_SCHEMAS[slug] ?? { heading: 'Report', fields: [] }
}
