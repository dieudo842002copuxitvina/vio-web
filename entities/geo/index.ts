export type {
  GeoEntityType,
  GeoRegion,
  GeoAliasReason,
  Province,
  District,
  Ward,
  ProvinceRoute,
  DistrictRoute,
  WardRoute,
} from './model/types'

export { getProvinces, getDistrictsByProvince } from './api/geo.server'
