// ── Lead Intelligence Layer ────────────────────────────────────────────────────

// Types & UI constants
export type { BehavioralLead, LeadTemperature, LeadTimelineEvent } from './types'
export {
  TEMP_ORDER,
  TEMP_LABEL,
  TEMP_EMOJI,
  TEMP_COLOR,
  TEMP_DOT_COLOR,
  EVENT_WEIGHT,
  EVENT_ICON,
  EVENT_LABEL,
} from './types'

// API — import directly, not via this barrel (server-only):
// import { getLeadScores, getLeadTimeline }
//   from '@/features/leads/api/lead-score.server'
