-- ── 002_attribute_schema_engine.sql ──────────────────────────────────────────
-- Dynamic attribute schema engine.
-- Replaces the key-based listing_attribute_values from 001 with a schema-linked
-- version. Safe: 001 table has no data yet.
--
-- Architecture:
--   listing_attribute_schemas  → one row per (listing_type, key)
--   listing_attribute_values   → one row per (listing_id, schema_id)
--
-- Adding a new vertical = INSERT rows into listing_attribute_schemas only.
-- No schema changes, no form rewrites, no filter rewrites.

-- ── Field type enum ───────────────────────────────────────────────────────────

do $$ begin
  create type listing_field_type_enum as enum (
    'text',        -- single-line free text
    'textarea',    -- multi-line free text
    'number',      -- integer or decimal
    'currency',    -- numeric, rendered with VND formatting
    'select',      -- single choice from options[]
    'multiselect', -- multiple choices from options[]
    'checkbox',    -- single boolean (yes/no toggle)
    'radio',       -- single choice, shown as radio buttons
    'date',        -- ISO date string
    'image',       -- URL (uploaded image)
    'phone',       -- tel input with VN format hint
    'url'          -- http(s) URL
  );
exception when duplicate_object then null; end $$;

-- ── Drop the key-based table from 001 (no data, safe) ────────────────────────

drop table if exists listing_attribute_values;

-- ── listing_attribute_schemas ─────────────────────────────────────────────────
-- One row per attribute definition per listing type.
-- Drives: form rendering, filter UI, search indexing, SEO, feed display.

create table if not exists listing_attribute_schemas (
  id               uuid                      primary key default gen_random_uuid(),
  listing_type     listing_type_enum         not null,
  key              text                      not null,
  label            text                      not null,
  field_type       listing_field_type_enum   not null,

  -- Behaviour flags
  required         boolean                   not null default false,
  searchable       boolean                   not null default false,  -- add to search_vector
  filterable       boolean                   not null default false,  -- show filter widget
  sortable         boolean                   not null default false,  -- allow ORDER BY

  -- UI hints
  display_order    integer                   not null default 0,
  placeholder      text,
  help_text        text,

  -- For select / multiselect / radio: [{value, label}]
  options          jsonb,

  -- Runtime validation: {min, max, minLength, maxLength, pattern, message}
  validation_rules jsonb,

  created_at       timestamptz               not null default now(),

  constraint listing_attribute_schemas_type_key_unique unique (listing_type, key)
);

-- ── listing_attribute_values ──────────────────────────────────────────────────
-- One row per (listing_id, schema_id). Exactly one value column is non-null.
--   text / textarea / select / radio / phone / url / image → value_text
--   number / currency                                       → value_number
--   multiselect / radio-multi                               → value_json (string[])
--   checkbox                                                → value_json (boolean cast as JSON)
--   date                                                    → value_text (ISO 8601)

create table if not exists listing_attribute_values (
  id           uuid        primary key default gen_random_uuid(),
  listing_id   uuid        not null references listings(id)                    on delete cascade,
  schema_id    uuid        not null references listing_attribute_schemas(id)   on delete restrict,
  value_text   text,
  value_number numeric,
  value_json   jsonb,
  created_at   timestamptz not null default now(),

  constraint listing_attribute_values_unique unique (listing_id, schema_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Schema lookups
create index if not exists lattr_schema_type_idx
  on listing_attribute_schemas (listing_type, display_order);

create index if not exists lattr_schema_filterable_idx
  on listing_attribute_schemas (listing_type, filterable)
  where filterable = true;

create index if not exists lattr_schema_searchable_idx
  on listing_attribute_schemas (listing_type, searchable)
  where searchable = true;

create index if not exists lattr_schema_sortable_idx
  on listing_attribute_schemas (listing_type, sortable)
  where sortable = true;

-- Value lookups
create index if not exists lattr_val_listing_idx
  on listing_attribute_values (listing_id);

create index if not exists lattr_val_schema_idx
  on listing_attribute_values (schema_id);

-- Filter queries: WHERE schema_id = $1 AND value_text = $2
create index if not exists lattr_val_text_filter_idx
  on listing_attribute_values (schema_id, value_text)
  where value_text is not null;

-- Range queries: WHERE schema_id = $1 AND value_number BETWEEN $2 AND $3
create index if not exists lattr_val_number_filter_idx
  on listing_attribute_values (schema_id, value_number)
  where value_number is not null;

-- Multiselect contains: value_json @> '["seafood"]'
create index if not exists lattr_val_json_gin_idx
  on listing_attribute_values using gin (value_json)
  where value_json is not null;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table listing_attribute_schemas  enable row level security;
alter table listing_attribute_values   enable row level security;

-- Schemas are public read (they're static config, not user data)
create policy "lattr_schemas_public_read" on listing_attribute_schemas
  for select using (true);

-- Values: public read inherits from listing visibility
create policy "lattr_values_public_read" on listing_attribute_values
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id
        and l.is_public         = true
        and l.moderation_status = 'approved'
        and l.status            = 'published'
    )
  );

create policy "lattr_values_owner_read" on listing_attribute_values
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "lattr_values_owner_write" on listing_attribute_values
  for all using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- ── Seed data ─────────────────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING → idempotent, safe to re-run.

-- LAND ────────────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, validation_rules)
values
  ('land', 'area_m2', 'Diện tích (m²)', 'number', true,  false, true, true,  10,
   'VD: 1200', '{"min": 10, "max": 10000000}'),
  ('land', 'price_per_m2', 'Giá / m²', 'currency', false, false, true, true, 20,
   'VD: 150000', '{"min": 0}'),
  ('land', 'legal_status', 'Pháp lý', 'select', true, true, true, false, 30,
   null, null),
  ('land', 'road_access', 'Đường vào', 'select', false, false, true, false, 40,
   null, null),
  ('land', 'soil_type', 'Loại đất', 'select', false, true, true, false, 50,
   null, null),
  ('land', 'water_source', 'Nguồn nước', 'multiselect', false, false, true, false, 60,
   null, null)
on conflict (listing_type, key) do nothing;

-- Legal status options
update listing_attribute_schemas
set options = '[
  {"value":"red_book",   "label":"Sổ đỏ"},
  {"value":"pink_book",  "label":"Sổ hồng"},
  {"value":"contract",   "label":"Hợp đồng mua bán"},
  {"value":"hand_write", "label":"Giấy tờ tay"},
  {"value":"other",      "label":"Khác"}
]'::jsonb
where listing_type = 'land' and key = 'legal_status';

-- Road access options
update listing_attribute_schemas
set options = '[
  {"value":"paved",   "label":"Đường nhựa"},
  {"value":"dirt",    "label":"Đường đất"},
  {"value":"private", "label":"Đường riêng"},
  {"value":"none",    "label":"Không có đường vào"}
]'::jsonb
where listing_type = 'land' and key = 'road_access';

-- Soil type options
update listing_attribute_schemas
set options = '[
  {"value":"agricultural", "label":"Đất nông nghiệp"},
  {"value":"garden",       "label":"Đất vườn"},
  {"value":"paddy",        "label":"Đất lúa"},
  {"value":"orchard",      "label":"Đất cây lâu năm"},
  {"value":"mixed",        "label":"Đất tổng hợp"}
]'::jsonb
where listing_type = 'land' and key = 'soil_type';

-- Water source options
update listing_attribute_schemas
set options = '[
  {"value":"well",   "label":"Giếng khoan"},
  {"value":"canal",  "label":"Kênh mương"},
  {"value":"rain",   "label":"Nước mưa"},
  {"value":"tap",    "label":"Nước máy"},
  {"value":"river",  "label":"Sông / hồ"}
]'::jsonb
where listing_type = 'land' and key = 'water_source';

-- SERVICE ─────────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, help_text, validation_rules)
values
  ('service', 'years_experience', 'Số năm kinh nghiệm', 'number', false, false, true, true, 10,
   'VD: 5', null, '{"min": 0, "max": 100}'),
  ('service', 'service_area', 'Khu vực phục vụ', 'text', false, true, false, false, 20,
   'VD: Đồng Nai, Bình Dương', null, null),
  ('service', 'onsite_support', 'Hỗ trợ tại chỗ', 'checkbox', false, false, true, false, 30,
   null, 'Dịch vụ có thể đến tận nơi cho khách hàng', null),
  ('service', 'certifications', 'Chứng chỉ / Bằng cấp', 'textarea', false, true, false, false, 40,
   'Liệt kê các chứng chỉ liên quan...', null, null)
on conflict (listing_type, key) do nothing;

-- RESTAURANT ──────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, options, validation_rules)
values
  ('restaurant', 'cuisine_type', 'Loại ẩm thực', 'multiselect', true, true, true, false, 10,
   null,
   '[{"value":"viet","label":"Việt Nam"},{"value":"chinese","label":"Trung Hoa"},{"value":"western","label":"Tây"},{"value":"seafood","label":"Hải sản"},{"value":"bbq","label":"Nướng"},{"value":"vegetarian","label":"Chay"},{"value":"japanese","label":"Nhật"},{"value":"korean","label":"Hàn"}]',
   null),
  ('restaurant', 'opening_hours', 'Giờ mở cửa', 'text', false, false, false, false, 20,
   'VD: 07:00 – 22:00', null, null),
  ('restaurant', 'seating_capacity', 'Sức chứa (chỗ)', 'number', false, false, true, true, 30,
   'VD: 80', null, '{"min": 1, "max": 5000}'),
  ('restaurant', 'reservation_enabled', 'Nhận đặt bàn trước', 'checkbox', false, false, true, false, 40,
   null, null, null),
  ('restaurant', 'average_spend', 'Chi phí trung bình / người', 'currency', false, false, true, true, 50,
   'VD: 150000', null, '{"min": 0}'),
  ('restaurant', 'parking', 'Bãi đỗ xe', 'checkbox', false, false, true, false, 60,
   null, null, null)
on conflict (listing_type, key) do nothing;

-- EVENT ───────────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, validation_rules)
values
  ('event', 'event_date', 'Ngày tổ chức', 'date', true,  false, true, true,  10,
   null, null),
  ('event', 'event_end_date', 'Ngày kết thúc', 'date', false, false, false, false, 20,
   null, null),
  ('event', 'ticket_price', 'Giá vé', 'currency', false, false, true, true, 30,
   'VD: 200000', '{"min": 0}'),
  ('event', 'max_attendees', 'Số lượng tham dự tối đa', 'number', false, false, true, true, 40,
   'VD: 500', '{"min": 1}'),
  ('event', 'event_format', 'Hình thức tổ chức', 'select', false, false, true, false, 50,
   null, null),
  ('event', 'registration_url', 'Link đăng ký', 'url', false, false, false, false, 60,
   'https://...', null)
on conflict (listing_type, key) do nothing;

-- Event format options
update listing_attribute_schemas
set options = '[
  {"value":"in_person", "label":"Trực tiếp"},
  {"value":"online",    "label":"Trực tuyến"},
  {"value":"hybrid",    "label":"Kết hợp"}
]'::jsonb
where listing_type = 'event' and key = 'event_format';

-- TOURISM ─────────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, validation_rules)
values
  ('tourism', 'tour_duration', 'Thời gian tour', 'text', false, false, false, false, 10,
   'VD: 2 ngày 1 đêm', null),
  ('tourism', 'group_size_max', 'Số khách tối đa / tour', 'number', false, false, true, false, 20,
   'VD: 15', '{"min": 1, "max": 1000}'),
  ('tourism', 'price_per_person', 'Giá / người', 'currency', false, false, true, true, 30,
   'VD: 1500000', '{"min": 0}'),
  ('tourism', 'departure_point', 'Điểm khởi hành', 'text', false, true, false, false, 40,
   'VD: 23 Lê Duẩn, Hà Nội', null)
on conflict (listing_type, key) do nothing;

-- RENTAL ──────────────────────────────────────────────────────────────────────

insert into listing_attribute_schemas
  (listing_type, key, label, field_type, required, searchable, filterable, sortable, display_order, placeholder, validation_rules)
values
  ('rental', 'rental_price_month', 'Giá thuê / tháng', 'currency', true, false, true, true, 10,
   'VD: 3000000', '{"min": 0}'),
  ('rental', 'area_m2', 'Diện tích (m²)', 'number', false, false, true, true, 20,
   'VD: 60', '{"min": 1}'),
  ('rental', 'deposit_months', 'Đặt cọc (tháng)', 'number', false, false, true, false, 30,
   'VD: 2', '{"min": 0, "max": 12}'),
  ('rental', 'furnished', 'Nội thất', 'select', false, false, true, false, 40,
   null, null)
on conflict (listing_type, key) do nothing;

-- Furnished options
update listing_attribute_schemas
set options = '[
  {"value":"full",    "label":"Đầy đủ nội thất"},
  {"value":"partial", "label":"Nội thất cơ bản"},
  {"value":"none",    "label":"Không có nội thất"}
]'::jsonb
where listing_type = 'rental' and key = 'furnished';
