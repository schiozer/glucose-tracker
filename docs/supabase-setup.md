# Supabase Database Setup - Glucose Tracking Application

Complete guide for setting up the Supabase database for the Glucose Tracking MVP.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Create Supabase Project](#create-supabase-project)
- [Apply Database Migrations](#apply-database-migrations)
- [Configure Environment Variables](#configure-environment-variables)
- [Verify Database Setup](#verify-database-setup)
- [Database Schema Overview](#database-schema-overview)
- [Row Level Security (RLS) Overview](#row-level-security-rls-overview)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Supabase account (create at [supabase.com](https://supabase.com))
- Project repository cloned locally
- Node.js 18+ installed (for optional Supabase CLI)

---

## Create Supabase Project

### Step 1: Create New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Configure project settings:
   - **Organization**: Select or create your organization
   - **Name**: `glucose-tracking-mvp` (or your preferred name)
   - **Database Password**: Generate a strong password (save securely!)
   - **Region**: **South America (São Paulo)** - `sa-east-1`
     - ⚠️ **CRITICAL**: Select São Paulo region for LGPD compliance
   - **Pricing Plan**: Free tier is sufficient for MVP

4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

### Step 2: Get Project Credentials

After project creation, collect the following credentials:

1. Go to **Settings** > **API**
2. Copy the following values:

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co

# Anon/Public Key (for client-side access)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (for server-side admin access - KEEP SECRET!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Go to **Settings** > **Database** > **Connection string**
4. Copy **Connection pooling** string for optional direct database access:

```bash
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

---

## Apply Database Migrations

### Option A: Using Supabase Dashboard (Recommended for MVP)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New query"**

#### Apply Migration 001 - Initial Schema

1. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
2. Paste into SQL Editor
3. Click **"Run"** or press `Cmd/Ctrl + Enter`
4. Verify success: You should see "Success. No rows returned"
5. Check **Database** > **Tables** to confirm 9 tables were created:
   - users
   - profiles
   - caregiver_access
   - glucose_readings
   - glucose_thresholds
   - reminders
   - push_subscriptions
   - audit_logs
   - user_consents

#### Apply Migration 002 - RLS Policies

1. Copy the entire contents of `supabase/migrations/002_rls_policies.sql`
2. Paste into SQL Editor
3. Click **"Run"** or press `Cmd/Ctrl + Enter`
4. Verify success: Check **Authentication** > **Policies** to see RLS policies

### Option B: Using Supabase CLI (Advanced)

If you prefer using the CLI:

#### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (all platforms)
npm install -g supabase
```

#### Login and Link Project

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR-PROJECT-REF
```

#### Apply Migrations

```bash
# Apply all migrations in order
supabase db push

# Or apply specific migration
supabase db push supabase/migrations/001_initial_schema.sql
supabase db push supabase/migrations/002_rls_policies.sql
```

---

## Configure Environment Variables

### Step 1: Create Environment Files

Create `.env.local` in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth0 Configuration (from Task 4)
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR-DOMAIN.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Optional: Direct database connection
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### Step 2: Verify Environment Variables

```bash
# Check that all required variables are set
npm run dev

# You should see no errors related to Supabase configuration
```

⚠️ **Security Notes:**
- Never commit `.env.local` to git (already in `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - use only in trusted server-side code
- Rotate keys if accidentally exposed

---

## Verify Database Setup

### Test 1: SQL Queries in Dashboard

Run these queries in **SQL Editor** to verify schema:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return: audit_logs, caregiver_access, glucose_readings,
--                glucose_thresholds, profiles, push_subscriptions,
--                reminders, user_consents, users

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should have rowsecurity = true

-- Check enums were created
SELECT typname FROM pg_type
WHERE typtype = 'e' AND typnamespace = (
  SELECT oid FROM pg_namespace WHERE nspname = 'public'
);

-- Should return: audit_action, diabetes_type, glucose_context,
--                reading_source, user_role
```

### Test 2: Connection from Application

Create a test script `scripts/test-db-connection.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  // Test basic connection
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1);

  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Database connection successful');
  console.log('✅ All tables are accessible');
}

testConnection();
```

Run test:

```bash
npx tsx scripts/test-db-connection.ts
```

### Test 3: Verify RLS Policies

```sql
-- Check policies exist for each table
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should return policies for all 9 tables
```

---

## Database Schema Overview

### Core Tables

1. **users** (9 columns)
   - User accounts synchronized from Auth0
   - Fields: id, auth0_id, email, email_verified, name, picture, role, last_login, created_at, updated_at

2. **profiles** (13 columns)
   - Patient medical profiles (multiple per user)
   - Fields: id, user_id, diabetes_type, diagnosis_date, date_of_birth, weight, height, medication, physician, physician_contact, notes, created_at, updated_at

3. **caregiver_access** (8 columns)
   - Manages caregiver access to patient data
   - Fields: id, patient_id, caregiver_id, granted_at, granted_by, access_level, revoked, revoked_at

4. **glucose_readings** (9 columns)
   - Glucose measurement entries
   - Fields: id, profile_id, value, reading_date, context, source, notes, created_at, updated_at
   - ⚠️ Uses `profile_id` (NOT user_id)

5. **glucose_thresholds** (9 columns)
   - Context-specific threshold configurations
   - Fields: id, profile_id, context, low, target_min, target_max, high, created_at, updated_at
   - ⚠️ Includes `context` field for context-specific thresholds

6. **reminders** (8 columns)
   - Scheduled reminders for measurements/medication
   - Fields: id, user_id, title, description, time, days_of_week, enabled, created_at, updated_at

7. **push_subscriptions** (7 columns)
   - Web Push API subscription endpoints
   - Fields: id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at

8. **audit_logs** (9 columns)
   - Immutable audit trail for compliance
   - Fields: id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at

9. **user_consents** (9 columns)
   - LGPD consent tracking
   - Fields: id, user_id, consent_type, given, given_at, revoked_at, version, ip_address, user_agent, created_at

### Key Constraints

- **Glucose values**: 20-600 mg/dL
- **Threshold ordering**: low < target_min ≤ target_max < high
- **Reading dates**: Cannot be in the future
- **Days of week**: 0-6 (Sunday-Saturday)
- **Unique constraints**: Profile+context thresholds, active caregiver access

### Indices

Performance indices on:
- Foreign keys (user_id, profile_id)
- Frequently queried columns (reading_date, context)
- Composite indices (profile_id + reading_date)

---

## Row Level Security (RLS) Overview

### Security Model

All tables have RLS enabled with policies that enforce:

1. **Users**: Can only access their own record
2. **Profiles**: Access own profiles + profiles shared via caregiver_access
3. **Readings/Thresholds**: Accessible through profile ownership or caregiver access
4. **Reminders/Push Subscriptions**: Own data only
5. **Caregiver Access**: Grant/revoke by profile owner
6. **Audit Logs**: Read own logs (service role inserts)
7. **User Consents**: Own consents only

### Key RLS Functions

```sql
-- Check if user has access to a profile
has_profile_access(profile_id UUID) RETURNS BOOLEAN

-- Get current user's UUID
get_user_id() RETURNS UUID

-- Check write permission (for API layer)
can_write_to_profile(profile_id UUID, user_auth0_id TEXT) RETURNS BOOLEAN

-- Check read permission (for API layer)
can_read_profile(profile_id UUID, user_auth0_id TEXT) RETURNS BOOLEAN
```

### Service Role Usage

Use service role key for:
- Creating users during Auth0 sync
- Inserting audit logs
- System-level operations

⚠️ Service role bypasses ALL RLS policies - use with extreme caution!

---

## Troubleshooting

### Error: "relation does not exist"

**Cause**: Migrations not applied or applied in wrong order

**Solution**:
```sql
-- Check which tables exist
\dt

-- If missing, rerun migrations in order:
-- 1. 001_initial_schema.sql
-- 2. 002_rls_policies.sql
```

### Error: "permission denied for table"

**Cause**: RLS policies blocking access or wrong credentials

**Solution**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Verify you're using correct auth context (auth.uid())
```

### Error: "new row violates check constraint"

**Cause**: Data doesn't meet constraint requirements

**Common Cases**:
- Glucose value outside 20-600 range
- Threshold ordering violated (low >= target_min or target_max >= high)
- Reading date in the future

**Solution**: Validate data before insert/update

### Error: "duplicate key value violates unique constraint"

**Cause**: Attempting to create duplicate records

**Common Cases**:
- Same profile_id + context in glucose_thresholds
- Same patient_id + caregiver_id + revoked=false in caregiver_access

**Solution**: Check for existing records before inserting

### Connection Timeout

**Cause**: Wrong region or connection pooling issues

**Solution**:
- Verify São Paulo region: `sa-east-1`
- Use connection pooling URL for high traffic
- Check firewall/VPN settings

### RLS Policies Not Working

**Cause**: Using service role key or auth context not set

**Solution**:
- Use anon key for client-side requests
- Ensure auth token is sent with requests
- Check `auth.uid()` returns correct value:

```sql
SELECT auth.uid(); -- Should return current user's auth0_id
```

---

## Next Steps

After successful database setup:

1. ✅ Database schema created (9 tables)
2. ✅ RLS policies configured
3. ✅ Environment variables set
4. 🔄 **Next**: Create API routes (Task 6)
5. 🔄 **Next**: Build profile management UI (Task 7)

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Support

For issues specific to this project:
1. Check migration files in `supabase/migrations/`
2. Review TypeScript types in `src/types/database.ts`
3. Verify query functions in `src/lib/supabase/queries.ts`

For Supabase platform issues:
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [Supabase Discord](https://discord.supabase.com)
