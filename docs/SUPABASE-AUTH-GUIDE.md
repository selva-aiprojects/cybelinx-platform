# Supabase Auth Setup & Integration Guide for Cybelinx SaaS Platform

This guide explains how to set up a **100% Free Supabase Auth project** (50,000 Free Monthly Active Users) and connect it to the Cybelinx platform and Next.js Admin Portal.

---

## 1. Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** (Free Forever Plan).
2. Create a project name (e.g. `cybelinx-saas-auth`) and set a database password.
3. Once created, go to **Project Settings** → **API**.
4. Note down your project credentials:
   * **Project URL**: `https://<your-project-id>.supabase.co`
   * **API Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI...`
   * **JWT Secret**: Found under **Project Settings** → **API** → **JWT Settings**.

---

## 2. Step 2: Configure Environment Variables

### Backend Configuration (`backend/central-api` & `.env`):

```env
# Set Provider to Supabase
IDP_PROVIDER=supabase
IDP_ISSUER=https://<your-project-id>.supabase.co/auth/v1
IDP_AUDIENCE=authenticated
IDP_JWT_SECRET=<your-supabase-jwt-secret>

# Or for JWKS RSA Verification:
IDP_JWKS_URI=https://<your-project-id>.supabase.co/auth/v1/.well-known/jwks.json
```

### Next.js Frontend Configuration (`apps/admin-portal/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

---

## 3. Step 3: Frontend Login Flow (Next.js Admin Portal)

Supabase Auth provides built-in Email/Password, Magic Link, Google, GitHub, and Enterprise SAML login methods.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@hospital.com',
  password: 'SecurePassword123!',
});

// Pass access_token to Cybelinx API
const token = data.session?.access_token;
const response = await fetch('http://localhost:3001/api/v1/tenants', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 4. Automatic Platform User Provisioning

When a user logs in via Supabase for the first time:
1. Cybelinx API receives the Bearer token issued by Supabase Auth.
2. `SupabaseIdentityProvider` validates the JWT signature and extracts `sub` (Supabase User UUID) and `email`.
3. `UserMappingService` automatically provisions a canonical platform user record in `user_identities` (`provider="supabase"`, `externalSubject=<sub-uuid>`).
4. Authorization RBAC rules are evaluated from tenant memberships.
