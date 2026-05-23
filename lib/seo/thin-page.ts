export const THRESHOLDS = {
  province:              10,
  district:               3,
  categoryProvince:       3,
  categoryDistrict:       2,
  provinceNavDistrict:    3,
  landProvince:           5,
  landDistrict:           2,
  landWard:               1,
  landProvinceNavDistrict:2,
  landDistrictNavWard:    1,
  cropProvince:           5,
  cropNational:           2,
  seasonProvince:         3,
  provinceCropNav:        5,
} as const

export type PageType   = keyof typeof THRESHOLDS
export type PageState  = 'not-found' | 'noindex' | 'indexed'
export type RobotsDirective = 'index, follow' | 'noindex, follow' | 'noindex, nofollow'

export function getPageState(type: PageType, count: number): PageState {
  if (count === 0)              return 'not-found'
  if (count < THRESHOLDS[type]) return 'noindex'
  return 'indexed'
}

export function getRobotsMeta(state: Exclude<PageState, 'not-found'>): RobotsDirective {
  return state === 'indexed' ? 'index, follow' : 'noindex, follow'
}

export function shouldShowInProvinceNav(count: number): boolean {
  return count >= THRESHOLDS.provinceNavDistrict
}
