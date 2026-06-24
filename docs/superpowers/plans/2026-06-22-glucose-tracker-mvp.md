# App de Acompanhamento de Glicemia - Plano de Implementação MVP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir MVP de aplicativo web responsivo para acompanhamento de glicemia familiar com autenticação, perfis, medições, dashboard, gráficos e exportação de relatórios.

**Architecture:** Next.js 14 App Router + TypeScript + Auth0 (autenticação) + Supabase PostgreSQL (banco com RLS) + shadcn/ui (componentes) + Recharts (gráficos). Deploy em Vercel.

**Tech Stack:**
- Frontend: Next.js 14, TypeScript, React 18, Tailwind CSS, shadcn/ui, Recharts
- Backend: Next.js API Routes, Supabase Client
- Database: Supabase PostgreSQL (região São Paulo)
- Auth: Auth0 (JWT tokens)
- Validation: Zod + React Hook Form
- Testing: Jest, React Testing Library, Playwright
- Deploy: Vercel

## Global Constraints

- Node.js >= 18.17.0
- Next.js 14.x (App Router)
- TypeScript strict mode
- Interface em português (BR)
- Valores de glicemia: 20-600 mg/dL
- Timestamps em UTC no banco, exibir no timezone local
- Conformidade LGPD: auditoria, criptografia, RLS
- Paginação: 50 itens por página
- Commits semânticos (Conventional Commits)

---

## Task 1: Setup do Projeto Next.js + TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Consumes: nenhum
- Produces: Projeto Next.js 14 funcional com TypeScript, Tailwind CSS, estrutura de pastas

- [ ] **Step 1: Inicializar projeto Next.js com TypeScript**

```bash
npx create-next-app@14 . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

Expected: Prompt para configuração - aceitar todas as opções padrão

- [ ] **Step 2: Instalar dependências principais**

```bash
npm install @supabase/supabase-js@2 @auth0/nextjs-auth0@3 zod react-hook-form @hookform/resolvers recharts date-fns
npm install -D @types/node @types/react @types/react-dom
```

Expected: Instalação bem-sucedida

- [ ] **Step 3: Criar estrutura de pastas**

```bash
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(dashboard\)/{dashboard,readings,charts,reports,settings}
mkdir -p src/app/api/{auth,profiles,readings,thresholds,reports,health}
mkdir -p src/components/{ui,features/{readings,charts,profiles},layouts}
mkdir -p src/lib/{supabase,auth0,validations,utils}
mkdir -p src/types
mkdir -p __tests__/{unit,integration}
mkdir -p public
```

Expected: Pastas criadas

- [ ] **Step 4: Configurar arquivo .env.local.example**

```bash
cat > .env.local.example << 'EOF'
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

Expected: Arquivo criado

- [ ] **Step 5: Atualizar next.config.js para segurança**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

Expected: Arquivo atualizado

- [ ] **Step 6: Criar .gitignore**

```bash
cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOF
```

Expected: Arquivo criado

- [ ] **Step 7: Verificar que o app roda**

```bash
npm run dev
```

Expected: App rodando em http://localhost:3000

- [ ] **Step 8: Commit inicial**

```bash
git init
git add .
git commit -m "feat: setup inicial do projeto Next.js 14 + TypeScript"
```

Expected: Commit realizado

---

## Task 2: Definir Tipos TypeScript e Schemas Zod

**Files:**
- Create: `src/types/database.ts`
- Create: `src/types/api.ts`
- Create: `src/lib/validations/schemas.ts`

**Interfaces:**
- Consumes: nenhum
- Produces: 
  - Types: `User`, `Profile`, `GlucoseReading`, `GlucoseThreshold`, `Reminder`, `CaregiverAccess`
  - Enums: `DiabetesType`, `GlucoseContext`, `ReadingSource`, `UserRole`
  - Zod schemas: `createReadingSchema`, `createProfileSchema`, `updateThresholdSchema`

- [ ] **Step 1: Criar tipos de banco de dados**

Create `src/types/database.ts`:

```typescript
export type UserRole = 'patient' | 'caregiver';

export type DiabetesType = 
  | 'type1' 
  | 'type2' 
  | 'gestational' 
  | 'prediabetes' 
  | 'other';

export type GlucoseContext = 
  | 'fasting'
  | 'pre_meal'
  | 'post_meal'
  | '2h_post_meal'
  | 'bedtime'
  | 'random';

export type ReadingSource = 'manual' | 'cgm_import';

export interface User {
  id: string; // UUID
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  birth_date: string; // ISO date
  diabetes_type: DiabetesType;
  created_at: string;
  updated_at: string;
}

export interface GlucoseReading {
  id: string;
  profile_id: string;
  value: number; // mg/dL
  measured_at: string; // ISO timestamp UTC
  context: GlucoseContext;
  notes: string | null;
  source: ReadingSource;
  created_at: string;
  updated_at: string;
}

export interface GlucoseThreshold {
  id: string;
  profile_id: string;
  context: GlucoseContext;
  low_threshold: number;
  target_min: number;
  target_max: number;
  high_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  profile_id: string;
  time: string; // HH:MM format
  context: GlucoseContext;
  days_of_week: string[]; // ['monday', 'tuesday', ...]
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaregiverAccess {
  id: string;
  caregiver_user_id: string;
  patient_profile_id: string;
  granted_at: string;
  granted_by: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'export';
  resource: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}
```

- [ ] **Step 2: Criar tipos de API**

Create `src/types/api.ts`:

```typescript
import type { 
  GlucoseReading, 
  GlucoseThreshold, 
  Profile 
} from './database';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateReadingRequest {
  profile_id: string;
  value: number;
  measured_at: string;
  context: string;
  notes?: string;
}

export interface CreateProfileRequest {
  name: string;
  birth_date: string;
  diabetes_type: string;
}

export interface UpdateThresholdRequest {
  profile_id: string;
  context: string;
  low_threshold: number;
  target_min: number;
  target_max: number;
  high_threshold: number;
}

export interface ReadingsListResponse {
  readings: GlucoseReading[];
  total: number;
  page: number;
  per_page: number;
}

export interface DashboardStats {
  last_reading: GlucoseReading | null;
  avg_7_days: number | null;
  std_dev_7_days: number | null;
  time_in_target_pct: number;
  time_below_target_pct: number;
  time_above_target_pct: number;
  readings_count_7_days: number;
}

export interface ReportData {
  profile: Profile;
  period_start: string;
  period_end: string;
  statistics: {
    total_readings: number;
    average: number;
    min: number;
    max: number;
    std_dev: number;
    time_in_target_pct: number;
    time_below_target_pct: number;
    time_above_target_pct: number;
  };
  readings: GlucoseReading[];
  thresholds: GlucoseThreshold[];
}
```

- [ ] **Step 3: Criar schemas Zod de validação**

Create `src/lib/validations/schemas.ts`:

```typescript
import { z } from 'zod';

// Enums
export const diabetesTypeEnum = z.enum([
  'type1',
  'type2',
  'gestational',
  'prediabetes',
  'other',
]);

export const glucoseContextEnum = z.enum([
  'fasting',
  'pre_meal',
  'post_meal',
  '2h_post_meal',
  'bedtime',
  'random',
]);

// Profile schemas
export const createProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  birth_date: z.string().refine((date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear;
  }, 'Data de nascimento inválida'),
  diabetes_type: diabetesTypeEnum,
});

export const updateProfileSchema = createProfileSchema.partial();

// Reading schemas
export const createReadingSchema = z.object({
  profile_id: z.string().uuid('ID de perfil inválido'),
  value: z.number()
    .int('Valor deve ser um número inteiro')
    .min(20, 'Valor mínimo: 20 mg/dL')
    .max(600, 'Valor máximo: 600 mg/dL'),
  measured_at: z.string().refine((date) => {
    const d = new Date(date);
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    return d <= now && d >= thirtyDaysAgo;
  }, 'Data deve estar entre hoje e 30 dias atrás'),
  context: glucoseContextEnum,
  notes: z.string().max(500, 'Observações: máximo 500 caracteres').optional(),
});

export const updateReadingSchema = createReadingSchema
  .omit({ profile_id: true })
  .partial();

// Threshold schemas
export const updateThresholdSchema = z.object({
  profile_id: z.string().uuid(),
  context: glucoseContextEnum,
  low_threshold: z.number().int().min(20).max(600),
  target_min: z.number().int().min(20).max(600),
  target_max: z.number().int().min(20).max(600),
  high_threshold: z.number().int().min(20).max(600),
}).refine((data) => {
  return (
    data.low_threshold < data.target_min &&
    data.target_min < data.target_max &&
    data.target_max < data.high_threshold
  );
}, {
  message: 'Thresholds devem seguir: low < target_min < target_max < high',
});

// Query params schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export const readingsFilterSchema = paginationSchema.extend({
  profile_id: z.string().uuid(),
  context: glucoseContextEnum.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const reportRequestSchema = z.object({
  profile_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  include_charts: z.coerce.boolean().default(true),
  include_table: z.coerce.boolean().default(true),
});

// Type inference
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type UpdateThresholdInput = z.infer<typeof updateThresholdSchema>;
export type ReadingsFilterInput = z.infer<typeof readingsFilterSchema>;
export type ReportRequestInput = z.infer<typeof reportRequestSchema>;
```

- [ ] **Step 4: Verificar que TypeScript compila**

```bash
npm run build
```

Expected: Build bem-sucedido sem erros de tipo

- [ ] **Step 5: Commit**

```bash
git add src/types src/lib/validations
git commit -m "feat: adiciona tipos TypeScript e schemas Zod de validação"
```

Expected: Commit realizado

---

## Task 3: Configurar Supabase Client e Helper Functions

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/queries.ts`
- Create: `src/lib/utils/calculations.ts`

**Interfaces:**
- Consumes: Types de `src/types/database.ts`
- Produces: 
  - `createClient()` - Supabase client para uso client-side
  - `createServerClient()` - Supabase client para uso server-side
  - Query functions: `getProfilesByUserId()`, `getReadingsByProfileId()`, `getThresholdsByProfileId()`
  - Calculation utils: `calculateStats()`, `determineGlucoseLevel()`

- [ ] **Step 1: Criar Supabase client (client-side)**

Create `src/lib/supabase/client.ts`:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
```

- [ ] **Step 2: Criar Supabase client (server-side)**

Create `src/lib/supabase/server.ts`:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

export function createServerClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

- [ ] **Step 3: Criar query functions**

Create `src/lib/supabase/queries.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Profile, 
  GlucoseReading, 
  GlucoseThreshold,
  GlucoseContext,
} from '@/types/database';

export async function getProfilesByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`user_id.eq.${userId},id.in.(select patient_profile_id from caregiver_access where caregiver_user_id = ${userId})`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProfileById(
  supabase: SupabaseClient,
  profileId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getReadingsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    context?: GlucoseContext;
    page?: number;
    perPage?: number;
  }
): Promise<{ readings: GlucoseReading[]; total: number }> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('glucose_readings')
    .select('*', { count: 'exact' })
    .eq('profile_id', profileId);

  if (options?.startDate) {
    query = query.gte('measured_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('measured_at', options.endDate);
  }
  if (options?.context) {
    query = query.eq('context', options.context);
  }

  query = query
    .order('measured_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    readings: data || [],
    total: count || 0,
  };
}

export async function getThresholdsByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<GlucoseThreshold[]> {
  const { data, error } = await supabase
    .from('glucose_thresholds')
    .select('*')
    .eq('profile_id', profileId);

  if (error) throw error;
  return data || [];
}

export async function getThresholdByProfileAndContext(
  supabase: SupabaseClient,
  profileId: string,
  context: GlucoseContext
): Promise<GlucoseThreshold | null> {
  const { data, error } = await supabase
    .from('glucose_thresholds')
    .select('*')
    .eq('profile_id', profileId)
    .eq('context', context)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// Default thresholds quando não configurado
export const DEFAULT_THRESHOLDS: Record<
  GlucoseContext,
  Omit<GlucoseThreshold, 'id' | 'profile_id' | 'created_at' | 'updated_at'>
> = {
  fasting: {
    context: 'fasting',
    low_threshold: 70,
    target_min: 80,
    target_max: 100,
    high_threshold: 126,
  },
  pre_meal: {
    context: 'pre_meal',
    low_threshold: 70,
    target_min: 80,
    target_max: 130,
    high_threshold: 180,
  },
  post_meal: {
    context: 'post_meal',
    low_threshold: 70,
    target_min: 90,
    target_max: 180,
    high_threshold: 250,
  },
  '2h_post_meal': {
    context: '2h_post_meal',
    low_threshold: 70,
    target_min: 90,
    target_max: 140,
    high_threshold: 200,
  },
  bedtime: {
    context: 'bedtime',
    low_threshold: 70,
    target_min: 100,
    target_max: 140,
    high_threshold: 180,
  },
  random: {
    context: 'random',
    low_threshold: 70,
    target_min: 80,
    target_max: 140,
    high_threshold: 200,
  },
};
```

- [ ] **Step 4: Criar funções de cálculo de estatísticas**

Create `src/lib/utils/calculations.ts`:

```typescript
import type { GlucoseReading, GlucoseThreshold } from '@/types/database';

export type GlucoseLevel = 'low' | 'target' | 'high' | 'unknown';

export function determineGlucoseLevel(
  value: number,
  threshold: GlucoseThreshold
): GlucoseLevel {
  if (value < threshold.low_threshold) return 'low';
  if (value >= threshold.target_min && value <= threshold.target_max) return 'target';
  if (value > threshold.high_threshold) return 'high';
  return 'unknown'; // Entre low e target_min OU entre target_max e high
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
  timeInTargetPct: number;
  timeBelowTargetPct: number;
  timeAboveTargetPct: number;
}

export function calculateStats(
  readings: GlucoseReading[],
  thresholds: GlucoseThreshold[]
): GlucoseStats {
  if (readings.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      count: 0,
      timeInTargetPct: 0,
      timeBelowTargetPct: 0,
      timeAboveTargetPct: 0,
    };
  }

  const values = readings.map((r) => r.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Time in target calculation
  const thresholdMap = new Map(
    thresholds.map((t) => [t.context, t])
  );

  let inTarget = 0;
  let belowTarget = 0;
  let aboveTarget = 0;

  readings.forEach((reading) => {
    const threshold = thresholdMap.get(reading.context);
    if (!threshold) {
      // Skip se não tem threshold configurado
      return;
    }

    const level = determineGlucoseLevel(reading.value, threshold);
    if (level === 'target') inTarget++;
    else if (level === 'low') belowTarget++;
    else if (level === 'high') aboveTarget++;
  });

  const total = inTarget + belowTarget + aboveTarget;

  return {
    average: Math.round(average),
    min,
    max,
    stdDev: Math.round(stdDev),
    count: readings.length,
    timeInTargetPct: total > 0 ? Math.round((inTarget / total) * 100) : 0,
    timeBelowTargetPct: total > 0 ? Math.round((belowTarget / total) * 100) : 0,
    timeAboveTargetPct: total > 0 ? Math.round((aboveTarget / total) * 100) : 0,
  };
}

export function formatGlucoseValue(value: number): string {
  return `${value} mg/dL`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
```

- [ ] **Step 5: Verificar que TypeScript compila**

```bash
npm run build
```

Expected: Build bem-sucedido

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase src/lib/utils
git commit -m "feat: configura Supabase client e funções de query/cálculo"
```

Expected: Commit realizado

---

## Task 4: Configurar Auth0 e Middleware de Autenticação

**Files:**
- Create: `src/app/api/auth/[auth0]/route.ts`
- Create: `src/lib/auth0/session.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: nenhum
- Produces:
  - Auth0 routes: `/api/auth/login`, `/api/auth/logout`, `/api/auth/callback`, `/api/auth/me`
  - `getSession()` - retorna Session com user info
  - Middleware que protege rotas `/dashboard/*`

- [ ] **Step 1: Instalar SDK do Auth0**

```bash
npm install @auth0/nextjs-auth0@3
```

Expected: Instalação bem-sucedida

- [ ] **Step 2: Criar rota dinâmica do Auth0**

Create `src/app/api/auth/[auth0]/route.ts`:

```typescript
import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
  }),
});
```

- [ ] **Step 3: Criar helper de sessão**

Create `src/lib/auth0/session.ts`:

```typescript
import { getSession as getAuth0Session } from '@auth0/nextjs-auth0';

export interface Session {
  user: {
    sub: string; // Auth0 user ID
    email: string;
    name: string;
    picture?: string;
  };
}

export async function getSession(): Promise<Session | null> {
  try {
    const session = await getAuth0Session();
    return session as Session | null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export function getUserIdFromSession(session: Session): string {
  // Auth0 sub format: "auth0|xxxxx" ou "google-oauth2|xxxxx"
  // Usamos o sub completo como user_id
  return session.user.sub;
}
```

- [ ] **Step 4: Criar middleware de autenticação**

Create `src/middleware.ts`:

```typescript
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/readings/:path*',
    '/charts/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/api/profiles/:path*',
    '/api/readings/:path*',
    '/api/thresholds/:path*',
    '/api/reports/:path*',
  ],
};
```

- [ ] **Step 5: Criar página de login**

Create `src/app/(auth)/login/page.tsx`:

```typescript
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Glicemia App
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Acompanhamento de glicemia para sua família
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/api/auth/login"
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Entrar
          </Link>

          <p className="text-center text-xs text-gray-500">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="#" className="underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Criar página inicial que redireciona**

Create `src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getSession } from '@auth0/nextjs-auth0';

export default async function HomePage() {
  const session = await getSession();
  
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
```

- [ ] **Step 7: Verificar que Auth0 está configurado**

```bash
# Criar .env.local com suas credenciais Auth0
cp .env.local.example .env.local
# Editar .env.local com valores reais (você precisará criar um tenant Auth0)
```

Expected: Arquivo .env.local criado

- [ ] **Step 8: Testar fluxo de login manualmente**

```bash
npm run dev
# Abrir http://localhost:3000
# Clicar em "Entrar"
# Verificar redirecionamento para Auth0
```

Expected: Redirecionamento para Auth0 Universal Login

- [ ] **Step 9: Commit**

```bash
git add src/app/api/auth src/lib/auth0 src/middleware.ts src/app/\(auth\) src/app/page.tsx
git commit -m "feat: configura Auth0 e middleware de autenticação"
```

Expected: Commit realizado

---

## Task 5: Setup do Banco de Dados Supabase (Schemas e RLS)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `docs/supabase-setup.md`

**Interfaces:**
- Consumes: Types de `src/types/database.ts`
- Produces: 
  - Schema completo no Supabase (9 tabelas)
  - RLS policies aplicadas
  - Índices otimizados
  - Valores padrão de thresholds

- [ ] **Step 1: Criar diretório de migrations**

```bash
mkdir -p supabase/migrations
```

Expected: Diretório criado

- [ ] **Step 2: Criar migration do schema inicial**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
CREATE TYPE diabetes_type AS ENUM ('type1', 'type2', 'gestational', 'prediabetes', 'other');
CREATE TYPE glucose_context AS ENUM ('fasting', 'pre_meal', 'post_meal', '2h_post_meal', 'bedtime', 'random');
CREATE TYPE reading_source AS ENUM ('manual', 'cgm_import');
CREATE TYPE audit_action AS ENUM ('read', 'create', 'update', 'delete', 'export');

-- Users table (sync with Auth0)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  diabetes_type diabetes_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Caregiver access table
CREATE TABLE caregiver_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caregiver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(caregiver_user_id, patient_profile_id)
);

-- Glucose readings table
CREATE TABLE glucose_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value >= 20 AND value <= 600),
  measured_at TIMESTAMPTZ NOT NULL CHECK (measured_at <= NOW()),
  context glucose_context NOT NULL,
  notes TEXT CHECK (LENGTH(notes) <= 500),
  source reading_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Glucose thresholds table
CREATE TABLE glucose_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context glucose_context NOT NULL,
  low_threshold INTEGER NOT NULL CHECK (low_threshold >= 20 AND low_threshold <= 600),
  target_min INTEGER NOT NULL CHECK (target_min >= 20 AND target_min <= 600),
  target_max INTEGER NOT NULL CHECK (target_max >= 20 AND target_max <= 600),
  high_threshold INTEGER NOT NULL CHECK (high_threshold >= 20 AND high_threshold <= 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, context),
  CHECK (low_threshold < target_min),
  CHECK (target_min < target_max),
  CHECK (target_max < high_threshold)
);

-- Reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  context glucose_context NOT NULL,
  days_of_week TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User consents table
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_user_id_name ON profiles(user_id, name);

CREATE INDEX idx_caregiver_access_caregiver ON caregiver_access(caregiver_user_id);
CREATE INDEX idx_caregiver_access_patient ON caregiver_access(patient_profile_id);

CREATE INDEX idx_readings_profile_id ON glucose_readings(profile_id);
CREATE INDEX idx_readings_profile_measured_at ON glucose_readings(profile_id, measured_at DESC);
CREATE INDEX idx_readings_profile_context ON glucose_readings(profile_id, context);

CREATE INDEX idx_thresholds_profile_context ON glucose_thresholds(profile_id, context);

CREATE INDEX idx_reminders_profile_id ON reminders(profile_id);
CREATE INDEX idx_reminders_is_active ON reminders(is_active);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_readings_updated_at
  BEFORE UPDATE ON glucose_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_thresholds_updated_at
  BEFORE UPDATE ON glucose_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 3: Criar migration de políticas RLS**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Profiles policies
CREATE POLICY "Users can read own profiles or shared profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid()::text = user_id::text
    OR id IN (
      SELECT patient_profile_id
      FROM caregiver_access
      WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Caregiver access policies
CREATE POLICY "Users can read their caregiver access"
  ON caregiver_access FOR SELECT
  USING (
    auth.uid()::text = caregiver_user_id::text
    OR patient_profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Profile owners can grant caregiver access"
  ON caregiver_access FOR INSERT
  WITH CHECK (
    patient_profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Profile owners can revoke caregiver access"
  ON caregiver_access FOR DELETE
  USING (
    patient_profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
    )
  );

-- Glucose readings policies
CREATE POLICY "Users can read readings from accessible profiles"
  ON glucose_readings FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert readings for accessible profiles"
  ON glucose_readings FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update readings from accessible profiles"
  ON glucose_readings FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete readings from accessible profiles"
  ON glucose_readings FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

-- Glucose thresholds policies (similar to readings)
CREATE POLICY "Users can read thresholds from accessible profiles"
  ON glucose_thresholds FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Profile owners can manage thresholds"
  ON glucose_thresholds FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
    )
  );

-- Reminders policies (similar to thresholds)
CREATE POLICY "Users can read reminders from accessible profiles"
  ON reminders FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
      UNION
      SELECT patient_profile_id FROM caregiver_access WHERE caregiver_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Profile owners can manage reminders"
  ON reminders FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id::text = auth.uid()::text
    )
  );

-- Push subscriptions policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid()::text = user_id::text);

-- Audit logs policies
CREATE POLICY "Users can read their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- User consents policies
CREATE POLICY "Users can read their own consents"
  ON user_consents FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
```

- [ ] **Step 4: Criar documentação de setup**

Create `docs/supabase-setup.md`:

```markdown
# Supabase Setup Guide

## 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie novo projeto
3. Região: **South America (São Paulo)** - `sa-east-1`
4. Database password: use um gerador de senhas forte

## 2. Aplicar Migrations

### Via Dashboard (UI):

1. Vá em "SQL Editor" no dashboard do Supabase
2. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Execute (Run)
4. Cole o conteúdo de `supabase/migrations/002_rls_policies.sql`
5. Execute (Run)

### Via CLI (recomendado):

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3. Configurar Variáveis de Ambiente

Copie as credenciais do dashboard:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key → `SUPABASE_SERVICE_ROLE_KEY` (Settings > API)

Cole no arquivo `.env.local`

## 4. Testar Conexão

```bash
npm run dev
# Checar logs para verificar conexão com Supabase
```

## 5. Popular Dados de Teste (opcional)

Ver `supabase/seed.sql` para dados iniciais de desenvolvimento.
```

- [ ] **Step 5: Aplicar migrations no Supabase**

```bash
# Manual: via Supabase Dashboard > SQL Editor
# Copiar e executar 001_initial_schema.sql
# Depois copiar e executar 002_rls_policies.sql
```

Expected: Tabelas criadas, RLS habilitado, índices aplicados

- [ ] **Step 6: Verificar schema no Supabase Dashboard**

```bash
# Abrir Supabase Dashboard > Table Editor
# Verificar que todas as 9 tabelas existem
```

Expected: 9 tabelas visíveis

- [ ] **Step 7: Commit**

```bash
git add supabase docs/supabase-setup.md
git commit -m "feat: cria schema inicial do banco e políticas RLS"
```

Expected: Commit realizado

---

*Este plano continua com mais tarefas para implementar as API routes, componentes de UI, páginas e testes. Por questões de tamanho, vou parar aqui e perguntar se você quer que eu continue com as próximas tarefas (API Routes, UI Components, Dashboard, etc.) ou se este formato está adequado.*

## Próximas Tarefas Planejadas (não detalhadas ainda):

- Task 6: API Routes - Profiles CRUD
- Task 7: API Routes - Glucose Readings CRUD  
- Task 8: API Routes - Thresholds
- Task 9: API Routes - Health Check
- Task 10: Setup shadcn/ui e Componentes Base
- Task 11: Layout Principal e Navegação
- Task 12: Página Dashboard (stats cards)
- Task 13: Página de Medições (lista + form)
- Task 14: Página de Gráficos (Recharts)
- Task 15: Página de Relatórios (preview + export)
- Task 16: Página de Configurações (thresholds)
- Task 17: Testes Unitários (utils, validations)
- Task 18: Testes de Integração (Playwright)
- Task 19: CI/CD (GitHub Actions)
- Task 20: Deploy Vercel

**Total estimado: 20 tarefas para MVP completo**
