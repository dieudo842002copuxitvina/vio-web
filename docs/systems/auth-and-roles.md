# Authentication & Role-Based Access Control

## Auth Provider: Supabase Auth

VIO LOCAL uses Supabase Auth with two primary sign-in methods:

| Method | Use case |
|---|---|
| **OTP (Phone/SMS)** | Seller registration — phone is identity anchor for Vietnam rural market |
| **Magic Link (Email)** | Admin / back-office users who prefer email |
| **OAuth (future)** | Google / Zalo — Phase 2 only |

Passwords are explicitly **not supported**. OTP/Magic Link only — reduces account recovery complexity and eliminates password breach surface.

---

## Profile Auto-Creation

A Postgres trigger fires on `INSERT INTO auth.users` to create the corresponding `profiles` row:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Role Model

VIO LOCAL uses two roles implemented via Postgres RLS — no external RBAC service.

| Role | How identified | Capabilities |
|---|---|---|
| **Anonymous** | No session | Read public, approved listings only |
| **Authenticated User** | Valid Supabase session | Read all public listings + own private listings; submit inquiries; create listings (pending review) |
| **Admin** | `profiles.is_admin = true` | Approve/reject listings; update `is_verified` on profiles; read all inquiries |

There is no "moderator" role in Phase 1 — admin handles all moderation.

---

## Row Level Security Policies

### `land_listings`

```sql
-- Public read: approved + public only
CREATE POLICY "public can read approved listings"
ON land_listings FOR SELECT
USING (is_public = true AND moderation_status = 'approved');

-- Owner read: can always see own listings regardless of status
CREATE POLICY "owner can read own listings"
ON land_listings FOR SELECT
USING (auth.uid() = owner_id);

-- Owner insert: authenticated users can create listings
CREATE POLICY "authenticated can insert listings"
ON land_listings FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owner update: can edit own listings (but not moderation_status)
CREATE POLICY "owner can update own listings"
ON land_listings FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
```

### `inquiries`

```sql
-- Anyone can submit an inquiry (buyer may not be logged in yet)
CREATE POLICY "anyone can insert inquiry"
ON inquiries FOR INSERT WITH CHECK (true);

-- Listing owner can read inquiries on their listings
CREATE POLICY "listing owner can read inquiries"
ON inquiries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM land_listings l
    WHERE l.id = land_listing_id AND l.owner_id = auth.uid()
  )
);

-- Listing owner can update status
CREATE POLICY "listing owner can update inquiry status"
ON inquiries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM land_listings l
    WHERE l.id = land_listing_id AND l.owner_id = auth.uid()
  )
);
```

### `profiles`

```sql
-- Public read: all profiles are readable (for seller card display)
CREATE POLICY "profiles are publicly readable"
ON profiles FOR SELECT USING (true);

-- Self-update only
CREATE POLICY "users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);
```

---

## Supabase Client Usage by Context

| Context | Import from | Notes |
|---|---|---|
| Server Component | `@/lib/supabase/server` | Reads session from cookies via `@supabase/ssr` |
| Server Action | `@/lib/supabase/server` | Same — cookie-based session |
| Client Component | `@/lib/supabase/client` | Singleton browser client, session from localStorage |
| Admin operations | `@/lib/supabase/server` → `createAdminClient()` | Service role key, bypasses RLS — only in trusted server contexts |

**Never** import `createAdminClient` in a Client Component or expose the service role key to the browser.

---

## Session Refresh

Session refresh is handled by Next.js middleware (`middleware.ts`) using `@supabase/ssr`. The middleware runs on every request, refreshes the session token if expired, and sets updated cookies. This ensures Server Components always have a valid session without client-side refresh logic.
