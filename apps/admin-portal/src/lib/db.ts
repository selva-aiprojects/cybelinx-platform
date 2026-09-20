/**
 * PostgreSQL connection pool for Vercel Node.js API routes.
 *
 * Automatically checks in order:
 *   1. DATABASE_URL
 *   2. POSTGRES_URL
 *   3. POSTGRES_PRISMA_URL
 *   4. SPRING_DATASOURCE_URL
 *
 * Handles common copy-paste formats:
 *   - Strips surrounding quotation marks (" or ')
 *   - Strips Java JDBC prefix (jdbc:postgresql:// -> postgresql://)
 *   - Safely URL-encodes user and password if they contain special characters (#, @, ?, /)
 *   - Automatically configures SSL for hosted databases (Aiven, Supabase, Neon, AWS RDS)
 */
import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;
let cachedEnvVar = '';

export function sanitizeConnectionString(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // 1. Remove surrounding quotes and trailing semicolons
  str = str.replace(/^["']|["'];?$/g, '').trim();

  // 2. Remove jdbc: prefix
  if (str.startsWith('jdbc:')) {
    str = str.slice(5).trim();
  }

  // 3. Ensure scheme
  const schemeMatch = str.match(/^(postgres(?:ql)?:\/\/)/i);
  let scheme = 'postgresql://';
  let rest = str;
  if (schemeMatch) {
    scheme = schemeMatch[1];
    rest = str.slice(schemeMatch[0].length);
  }

  // Authority ends at the first '/' or '?'
  const slashIdx = rest.indexOf('/');
  const qIdx = rest.indexOf('?');
  let endOfAuthority = rest.length;
  if (slashIdx !== -1 && qIdx !== -1) {
    endOfAuthority = Math.min(slashIdx, qIdx);
  } else if (slashIdx !== -1) {
    endOfAuthority = slashIdx;
  } else if (qIdx !== -1) {
    endOfAuthority = qIdx;
  }

  const authority = rest.slice(0, endOfAuthority);
  const pathAndQuery = rest.slice(endOfAuthority);

  const atIdx = authority.lastIndexOf('@');
  if (atIdx !== -1) {
    const userInfo = authority.slice(0, atIdx);
    const hostPort = authority.slice(atIdx + 1);

    const colonIdx = userInfo.indexOf(':');
    let user = userInfo;
    let pass = '';
    if (colonIdx !== -1) {
      user = userInfo.slice(0, colonIdx);
      pass = userInfo.slice(colonIdx + 1);
    }

    const safeUser = encodeURIComponent(safeDecode(user));
    const safePass = pass ? `:${encodeURIComponent(safeDecode(pass))}` : '';

    return `${scheme}${safeUser}${safePass}@${hostPort}${pathAndQuery}`;
  }

  return `${scheme}${rest}`;
}

function safeDecode(val: string): string {
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

export function resolveConnectionString(): { url: string; envVar: string } {
  const candidates: { key: string; val: string | undefined }[] = [
    { key: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { key: 'POSTGRES_URL', val: process.env.POSTGRES_URL },
    { key: 'POSTGRES_PRISMA_URL', val: process.env.POSTGRES_PRISMA_URL },
    { key: 'SPRING_DATASOURCE_URL', val: process.env.SPRING_DATASOURCE_URL },
  ];

  for (const c of candidates) {
    if (c.val && c.val.trim().length > 0) {
      return { url: sanitizeConnectionString(c.val), envVar: c.key };
    }
  }

  return { url: '', envVar: '' };
}

export function getDatabaseDiagnostics(): {
  configured: boolean;
  envVar: string;
  target?: string;
  database?: string;
  hasSsl: boolean;
  rawSample?: string;
} {
  const { url, envVar } = resolveConnectionString();
  if (!url) {
    return { configured: false, envVar: 'NONE', hasSsl: false };
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const database = parsed.pathname.replace(/^\//, '') || 'default';
    const user = parsed.username || 'unknown';
    return {
      configured: true,
      envVar,
      target: `${user}@${host}:${port}`,
      database,
      hasSsl: !url.includes('localhost'),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      envVar,
      target: `Unparseable URL (${msg})`,
      hasSsl: false,
    };
  }
}

export function getPool(): Pool {
  if (!pool) {
    const { url, envVar } = resolveConnectionString();
    if (!url) {
      throw new Error(
        'DATABASE_URL is not configured. Set DATABASE_URL in Vercel project environment variables.'
      );
    }
    cachedEnvVar = envVar;

    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[pg pool background error]', err.message);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const p = getPool();
  const client: PoolClient = await p.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const p = getPool();
  const client: PoolClient = await p.connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
}
