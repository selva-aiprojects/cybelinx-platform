# StoreAI Integration Guide for Cybelinx SaaS Platform

This guide explains how to integrate **StoreAI Enterprise** ([`selva-aiprojects/storeai`](https://github.com/selva-aiprojects/storeai)) with the **Cybelinx Central SaaS Control Plane** using `@cybelinx/sdk`.

---

## 1. Installation

In the StoreAI backend repository (`main/server`):

```bash
npm install @cybelinx/sdk
```

---

## 2. Express Server Middleware Setup (`main/server/index.js` or `main/server/app.js`)

Add the Cybelinx multi-tenant middleware before your route handlers:

```typescript
import express from 'express';
import { createCybelinxMiddleware, getSearchPathSql } from '@cybelinx/sdk';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// 1. Enable Cybelinx Tenant & SSO Auth Middleware
app.use(
  createCybelinxMiddleware({
    productCode: 'STOREAI',
    allowAnonymous: false,
  })
);

// 2. Dynamic Schema Isolation Middleware (PostgreSQL search_path)
app.use(async (req, res, next) => {
  if (req.cybelinxContext) {
    const schemaSql = getSearchPathSql(req.cybelinxContext.schemaName);
    // Automatically sets search_path to tenant_<code_hash>_storeai, public
    await prisma.$executeRawUnsafe(schemaSql);
  }
  next();
});

// 3. Example Route Protecting Premium Features via Entitlement Check
app.post('/api/ai/recommendations', (req, res) => {
  const ctx = req.cybelinxContext;

  if (!ctx?.hasEntitlement('AI_RECOMMENDATIONS')) {
    return res.status(403).json({
      statusCode: 403,
      message: 'Feature AI_RECOMMENDATIONS requires an active StoreAI Enterprise Plan',
      code: 'ENTITLEMENT_REQUIRED',
    });
  }

  // Feature logic...
});
```

---

## 3. How Tenant Isolation & SSO Work End-to-End

1. **User Sign In**: User signs in at `https://cybelinx.com` or receives an invitation email.
2. **SSO Redirect**: Central IAM issues a signed RS256 JWT containing `tenant_id`, `tenant_code`, `roles`, and `entitlements`.
3. **StoreAI Request**: Client app includes `Authorization: Bearer <jwt>` or `X-Tenant-Code: NIKE`.
4. **Context & Schema Switch**:
   - `@cybelinx/sdk` decodes token and sets `req.cybelinxContext`.
   - Dynamic DDL switches query context to `tenant_nike_storeai`.
5. **Data Isolation**: All queries execute safely inside the merchant's isolated PostgreSQL DDL schema (`tenant_nike_storeai`).
