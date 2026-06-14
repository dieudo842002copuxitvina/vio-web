# VIO LOCAL — Isolated Module

This module contains all LOCAL economy features that are NOT part of VIO AGRI.

## Domain

Listing types: `restaurant`, `tourism`, `rental`, `event`
Features: booking, O2O routing, F&B, hospitality, local retail

## Isolation Status

- [x] Module root created
- [ ] features/booking → src/modules/local/booking/
- [ ] features/o2o     → src/modules/local/o2o/
- [ ] app/nha-hang/    → src/modules/local/routes/nha-hang/
- [ ] app/du-lich/     → src/modules/local/routes/du-lich/
- [ ] app/su-kien/     → src/modules/local/routes/su-kien/
- [ ] app/cho-thue/    → src/modules/local/routes/cho-thue/

## Future

Product name:  VIO LOCAL
Domain:        violocal.vn
Database:      Separate Supabase schema (migrate from shared 'local' domain filter)

## Database Separation Plan

1. Add `domain` column to `categories` table: 'agri' | 'local' | 'shared'
2. Tag all restaurant/tourism/event/rental categories as `domain = 'local'`
3. Filter homepage and VIO AGRI queries with `.neq('type', 'restaurant').neq('type', 'tourism')...`
4. When ready: migrate `listings WHERE domain='local'` to separate Supabase project
