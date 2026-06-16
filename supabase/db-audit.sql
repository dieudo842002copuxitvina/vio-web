/*
 * ════════════════════════════════════════════════════════════════════════════
 *  VIO AGRI — PRE-LAUNCH DATABASE AUDIT
 *  Ngày tạo  : 2026-06-15
 *
 *  Cách chạy:
 *    Supabase Dashboard → SQL Editor → paste toàn bộ file → Run (⌘ Enter)
 *    Mỗi câu SELECT trả về một result set riêng (Supabase hiển thị tab cuối
 *    cùng; chạy từng section một bằng cách bôi đen + Run Selection nếu cần).
 *
 *  Gồm 4 section:
 *    §1  Tất cả bảng public — trạng thái RLS + kích thước
 *    §2  Cột FK/convention thiếu index (bottleneck risk)
 *    §3  Số lượng policy theo lệnh trên các bảng quan trọng
 *    §4  Bảng có RLS ON nhưng 0 policy (silent deny-all — LỖI NGHIÊM TRỌNG)
 * ════════════════════════════════════════════════════════════════════════════
 */


-- ────────────────────────────────────────────────────────────────────────────
-- §1  TRẠNG THÁI RLS TOÀN BỘ BẢNG TRONG PUBLIC SCHEMA
--
--     Kết quả mong muốn: KHÔNG có hàng nào với rls_status = '🔴 RLS OFF'
--     Cột force_rls: nếu NO → table owner có thể bypass RLS khi connect trực tiếp.
--                    Với Supabase, service_role luôn bypass — đây là bình thường.
--     Cột zero_policy_risk: cảnh báo nếu RLS ON mà chưa có policy nào.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    c.relname                                                AS table_name,

    CASE c.relrowsecurity
        WHEN true  THEN '✅ RLS ON'
        WHEN false THEN '🔴 RLS OFF — cần bật ngay'
    END                                                      AS rls_status,

    CASE c.relforcerowsecurity
        WHEN true  THEN 'YES'
        ELSE            'NO (owner bypass)'
    END                                                      AS force_rls,

    (
        SELECT COUNT(*)::int
        FROM   pg_policies p
        WHERE  p.schemaname = 'public'
          AND  p.tablename  = c.relname
    )                                                        AS policy_count,

    CASE
        WHEN NOT c.relrowsecurity
            THEN '⚪ RLS OFF'
        WHEN (
            SELECT COUNT(*) FROM pg_policies p
            WHERE p.schemaname = 'public' AND p.tablename = c.relname
        ) = 0
            THEN '🔴 0 policy → deny all'
        ELSE '✅ OK'
    END                                                      AS zero_policy_risk,

    pg_size_pretty(pg_total_relation_size(c.oid))            AS table_size

FROM  pg_class     c
JOIN  pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind  = 'r'                -- chỉ ordinary tables, bỏ view/matview
ORDER BY
    c.relrowsecurity          ASC,    -- RLS OFF nổi lên đầu
    policy_count              ASC,    -- ít policy lên trước
    pg_total_relation_size(c.oid) DESC;


-- ────────────────────────────────────────────────────────────────────────────
-- §2  CỘT FK / CONVENTION THIẾU INDEX
--
--     Lý do: PostgreSQL dùng Sequential Scan trên cột không có index khi JOIN
--     hoặc WHERE. Ở quy mô > 10k rows, mỗi query tăng 10–500ms.
--
--     Hai nguồn được gộp lại:
--       A. FK constraint chính thức (FOREIGN KEY … REFERENCES …)
--       B. Naming convention: cột kết thúc _id, _code, _uuid
--          (VIO AGRI dùng convention thay FK thực vì Supabase discourage FK
--           trỏ auth.users và các bảng cross-schema)
--
--     Định nghĩa "có index": cột phải là KEY COLUMN ĐẦU TIÊN (position 0)
--     của ít nhất 1 B-tree index — đây là điều kiện để PostgreSQL planner
--     có thể dùng index cho WHERE col = ? hoặc JOIN … ON col = ?.
--
--     Kết quả mong muốn: KHÔNG có hàng nào với index_status = '🔴 Thiếu'
-- ────────────────────────────────────────────────────────────────────────────
WITH

-- Cột đứng ĐẦU TIÊN của ít nhất 1 index (bất kỳ loại: btree, hash, brin)
indexed_leading_col AS (
    SELECT DISTINCT
        t.relname   AS table_name,
        a.attname   AS col_name
    FROM  pg_index     ix
    JOIN  pg_class     t  ON t.oid  = ix.indrelid
    JOIN  pg_namespace n  ON n.oid  = t.relnamespace
    JOIN  pg_attribute a  ON a.attrelid = ix.indrelid
                         AND a.attnum   = ix.indkey[0]  -- vị trí 0 = leading col
    WHERE n.nspname = 'public'
      AND t.relkind = 'r'
      AND a.attnum  > 0           -- loại cột hệ thống (attnum ≤ 0)
      AND NOT a.attisdropped
),

-- Nguồn A: Declared FK constraints
declared_fk_cols AS (
    SELECT DISTINCT
        kcu.table_name,
        kcu.column_name,
        'A — Declared FK'::text  AS source_tag
    FROM  information_schema.key_column_usage  kcu
    JOIN  information_schema.table_constraints tc
        ON  tc.constraint_name = kcu.constraint_name
        AND tc.table_schema    = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema   = 'public'
),

-- Nguồn B: Naming convention (_id / _code / _uuid)
convention_fk_cols AS (
    SELECT
        c.table_name,
        c.column_name,
        'B — Convention (_id/_code/_uuid)'::text  AS source_tag
    FROM  information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name  <> 'id'              -- bỏ PK của bảng
      AND (
              c.column_name LIKE '%\_id'       -- kết thúc _id  (owner_id, listing_id…)
           OR c.column_name LIKE '%\_code'     -- kết thúc _code (province_code…)
           OR c.column_name LIKE '%\_uuid'     -- kết thúc _uuid
      )
),

-- Gộp hai nguồn; ưu tiên tag "Declared FK" nếu cùng (table, col)
all_candidate_cols AS (
    SELECT table_name, column_name, MIN(source_tag) AS source_tag
    FROM (
        SELECT * FROM declared_fk_cols
        UNION ALL
        SELECT * FROM convention_fk_cols
    ) combined
    GROUP BY table_name, column_name
)

SELECT
    acc.table_name,
    acc.column_name,
    acc.source_tag,

    CASE
        WHEN ilc.col_name IS NOT NULL
            THEN '✅ Index OK'
        ELSE
            '🔴 Thiếu index — nguy cơ Sequential Scan'
    END                            AS index_status

FROM  all_candidate_cols acc
LEFT JOIN indexed_leading_col ilc
    ON  ilc.table_name = acc.table_name
    AND ilc.col_name   = acc.column_name

ORDER BY
    (ilc.col_name IS NOT NULL) ASC,   -- thiếu index lên đầu
    acc.table_name,
    acc.column_name;


-- ────────────────────────────────────────────────────────────────────────────
-- §3  TÌNH TRẠNG POLICIES TRÊN CÁC BẢNG QUAN TRỌNG
--
--     Mỗi lệnh SQL (SELECT/INSERT/UPDATE/DELETE) cần ít nhất 1 policy.
--     Nếu RLS ON và lệnh đó = 0 policy → Supabase TỪ CHỐI tất cả request.
--     Lưu ý: policy với cmd = 'ALL' bao phủ cả 4 lệnh.
--
--     Kiểm tra cột assessment:
--       ✅ Có policies → bình thường
--       🟡 Thiếu SELECT → anonymous/authenticated user không đọc được
--       🔴 0 policy → DENY ALL (nghiêm trọng nhất)
--       ⚪ RLS OFF    → không bảo vệ bởi RLS
-- ────────────────────────────────────────────────────────────────────────────
WITH important_tables(tbl) AS (
    VALUES
        ('listings'),
        ('profiles'),
        ('crm_leads'),
        ('crm_lead_events'),
        ('lead_events'),
        ('payment_requests'),
        ('subscriptions'),
        ('subscription_plans'),
        ('visit_requests'),
        ('legal_review_requests'),
        ('saved_searches'),
        ('saved_search_matches'),
        ('blogs'),
        ('moderation_queue'),
        ('audit_logs'),
        ('fraud_signals'),
        ('agency_accounts'),
        ('agency_members'),
        ('agency_metrics'),
        ('pricing_experiments'),
        ('marketplace_daily_metrics'),
        ('marketplace_alerts'),
        ('province_liquidity_scores'),
        ('seller_trust_scores'),
        ('merchant_verifications'),
        ('verification_requests')
),

policy_counts AS (
    SELECT
        p.tablename,
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE p.cmd IN ('SELECT', 'ALL'))         AS can_select,
        COUNT(*) FILTER (WHERE p.cmd IN ('INSERT', 'ALL'))         AS can_insert,
        COUNT(*) FILTER (WHERE p.cmd IN ('UPDATE', 'ALL'))         AS can_update,
        COUNT(*) FILTER (WHERE p.cmd IN ('DELETE', 'ALL'))         AS can_delete,
        -- Named counts by exact cmd for the detail columns
        COUNT(*) FILTER (WHERE p.cmd = 'SELECT')                   AS select_only,
        COUNT(*) FILTER (WHERE p.cmd = 'INSERT')                   AS insert_only,
        COUNT(*) FILTER (WHERE p.cmd = 'UPDATE')                   AS update_only,
        COUNT(*) FILTER (WHERE p.cmd = 'DELETE')                   AS delete_only,
        COUNT(*) FILTER (WHERE p.cmd = 'ALL')                      AS all_cmd
    FROM  pg_policies p
    WHERE p.schemaname = 'public'
    GROUP BY p.tablename
)

SELECT
    it.tbl                                                           AS table_name,

    COALESCE(c.relrowsecurity, false)                                AS rls_on,

    COALESCE(pc.select_only, 0)                                      AS "SELECT",
    COALESCE(pc.insert_only, 0)                                      AS "INSERT",
    COALESCE(pc.update_only, 0)                                      AS "UPDATE",
    COALESCE(pc.delete_only, 0)                                      AS "DELETE",
    COALESCE(pc.all_cmd,    0)                                       AS "ALL",
    COALESCE(pc.total,      0)                                       AS total_policies,

    CASE
        WHEN NOT COALESCE(c.relrowsecurity, false)
            THEN '⚪ RLS OFF'
        WHEN COALESCE(pc.total, 0) = 0
            THEN '🔴 0 policy → deny all'
        WHEN COALESCE(pc.can_select, 0) = 0
            THEN '🟡 Không có SELECT policy (anon/user bị chặn đọc)'
        WHEN COALESCE(pc.can_insert, 0) = 0
            THEN '🟡 Không có INSERT policy'
        ELSE '✅ Có policies đủ loại'
    END                                                              AS assessment

FROM  important_tables it
-- bảng có thể chưa tồn tại nếu migration chưa chạy → LEFT JOIN
LEFT JOIN pg_class     c   ON c.relname    = it.tbl
LEFT JOIN pg_namespace n   ON n.oid        = c.relnamespace AND n.nspname = 'public'
LEFT JOIN policy_counts pc ON pc.tablename = it.tbl

ORDER BY
    COALESCE(c.relrowsecurity, false) ASC,   -- RLS OFF trước
    COALESCE(pc.total, 0)             ASC,   -- ít policy trước
    it.tbl;


-- ────────────────────────────────────────────────────────────────────────────
-- §4  CẢNH BÁO NGHIÊM TRỌNG: BẢNG CÓ RLS ON NHƯNG 0 POLICY
--
--     Đây là lỗi cấu hình nguy hiểm nhất: bảng có RLS bật nhưng không có
--     policy nào → PostgreSQL từ chối 100% request từ anon + authenticated.
--     Ngay cả admin user (authenticated) cũng không đọc/ghi được.
--     (service_role vẫn bypass — nhưng frontend hoàn toàn bị chặn.)
--
--     Kết quả mong muốn: KHÔNG CÓ hàng nào trong kết quả này.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
    c.relname                                                        AS table_name,
    pg_size_pretty(pg_total_relation_size(c.oid))                    AS table_size,
    '🔴 RLS ON + 0 policy → tất cả request bị DENY'                AS problem,
    'ALTER TABLE public.' || c.relname || ' DISABLE ROW LEVEL SECURITY; -- TẠM THỜI'
        || E'\n-- hoặc: tạo policy SELECT cho bảng này'             AS suggested_action

FROM  pg_class c
JOIN  pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname         = 'public'
  AND c.relkind          = 'r'
  AND c.relrowsecurity   = true        -- RLS đang bật
  AND NOT EXISTS (                     -- nhưng không có policy nào
        SELECT 1
        FROM   pg_policies p
        WHERE  p.schemaname = 'public'
          AND  p.tablename  = c.relname
      )
ORDER BY pg_total_relation_size(c.oid) DESC;
