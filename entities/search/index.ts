export type {
  SearchFilters,
  SearchRankedHit,
  AutocompleteHit,
  FacetCount,
  SearchFacets,
  SearchResult,
} from './types'

export type { SearchIntent, SearchEntityHint } from './model/normalize'
export {
  normalizeVi,
  toSlug,
  parseSearchIntent,
  parsePriceHint,
  parseAreaHint,
} from './model/normalize'

export { RANK_WEIGHTS } from './model/rank'
export type { RankWeightKey } from './model/rank'
