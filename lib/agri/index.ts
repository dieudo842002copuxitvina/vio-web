// Agricultural Knowledge Graph — unified re-exports
// Pure TypeScript constants, zero latency, fully type-safe.

export type { CropProfile, CropCategory }  from './crop-profiles'
export { CROP_PROFILES, CROPS_BY_SOIL, getCropProfile, getCropsBySoil } from './crop-profiles'

export type { SoilProfile } from './soil-profiles'
export { SOIL_PROFILES, getSoilProfile, SOIL_FERTILITY_ORDER } from './soil-profiles'

export type { AgriRegion, ClimateType } from './climate-zones'
export { AGRI_REGIONS, getRegionForProvince, getRegionById } from './climate-zones'

export type { ProvinceAgriProfile } from './province-agri-data'
export { PROVINCE_AGRI_DATA, getProvinceAgriProfile } from './province-agri-data'
