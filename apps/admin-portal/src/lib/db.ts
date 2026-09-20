/**
 * PostgreSQL connection pool for Vercel Node.js API routes.
 *
 * Automatically checks candidate environment variables in order:
 *   1. DATABASE_URL
 *   2. POSTGRES_URL
 *   3. POSTGRES_PRISMA_URL
 *   4. SPRING_DATASOURCE_URL
 *
 * Parses connection configuration directly to bypass URL parser strictness
 * and handle common copy-paste artifacts (quotes, jdbc: prefix, unencoded passwords, typos).
 */
import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;
let lastRawStr = '';

export function safeMask(str: string): string {
  if (!str) return 'EMPTY';
  return str.replace(/^(postgres(?:ql)?:\/\/)([^:@]+)(?::([^@]+))?@/i, (m, proto, u, p) => {
    const userMasked = u ? u.slice(0, 3) + '***' : '***';
    const passMasked = p ? '***' : '';
    return `${proto}${userMasked}:${passMasked}@`;
  });
}

export function parseDatabaseConfig(raw?: string): { config: PoolConfig; envVar: string } | null {
  const candidates: { key: string; val: string | undefined }[] = [
    { key: 'DATABASE_URL', val: process.env.DATABASE_URL },
    { key: 'POSTGRES_URL', val: process.env.POSTGRES_URL },
    { key: 'POSTGRES_PRISMA_URL', val: process.env.POSTGRES_PRISMA_URL },
    { key: 'SPRING_DATASOURCE_URL', val: process.env.SPRING_DATASOURCE_URL },
  ];

  let rawStr = raw;
  let sourceEnv = 'DIRECT';

  if (!rawStr) {
    for (const c of candidates) {
      if (c.val && c.val.trim().length > 0) {
        rawStr = c.val;
        sourceEnv = c.key;
        break;
      }
    }
  }

  if (!rawStr) return null;
  lastRawStr = rawStr;

  let str = rawStr.trim().replace(/^["']|["'];?$/g, '').trim();
  if (str.startsWith('jdbc:')) {
    str = str.slice(5).trim();
  }
  // Strip scheme
  str = str.replace(/^postgres(?:ql)?:\/\//i, '');

  // Fix common typo: slash instead of dot before domain (e.g. .f/aivencloud.com -> .f.aivencloud.com)
  str = str.replace(/([a-zA-Z0-9_-]+)\/(aivencloud\.com)/gi, '$1.$2');

  let user = '';
  let password = '';
  let host = 'localhost';
  let port = 5432;
  let database = 'cybelinx_platform';

  // Extract query parameters if any
  const qIdx = str.indexOf('?');
  let base = str;
  if (qIdx !== -1) {
    base = str.slice(0, qIdx);
  }

  // Extract path (database name)
  const slashIdx = base.indexOf('/');
  let authority = base;
  if (slashIdx !== -1) {
    authority = base.slice(0, slashIdx);
    database = base.slice(slashIdx + 1).trim() || database;
  }

  // Extract credentials
  const atIdx = authority.lastIndexOf('@');
  let hostPort = authority;
  if (atIdx !== -1) {
    const creds = authority.slice(0, atIdx);
    hostPort = authority.slice(atIdx + 1);
    const colonIdx = creds.indexOf(':');
    if (colonIdx !== -1) {
      user = creds.slice(0, colonIdx);
      password = creds.slice(colonIdx + 1);
    } else {
      user = creds;
    }
  }

  // Extract host and port
  hostPort = hostPort.replace(/^https?:\/\//i, '').replace(/^\/\//, '').trim();
  const colonIdx = hostPort.indexOf(':');
  if (colonIdx !== -1) {
    host = hostPort.slice(0, colonIdx).trim();
    const p = parseInt(hostPort.slice(colonIdx + 1).trim(), 10);
    if (!isNaN(p)) port = p;
  } else {
    host = hostPort || 'localhost';
  }

  // Self-heal Aiven hostname if found anywhere in the string
  const aivenMatch = rawStr.match(/([a-zA-Z0-9_.-]+(?:\.|\/)aivencloud\.com)(?::(\d+))?/i);
  if (aivenMatch) {
    host = aivenMatch[1].replace('/', '.');
    if (aivenMatch[2]) port = parseInt(aivenMatch[2], 10);
  }

  if (rawStr.includes('cybelinx-platform')) {
    database = 'cybelinx-platform';
  }

  try {
    user = decodeURIComponent(user);
  } catch {}
  try {
    password = decodeURIComponent(password);
  } catch {}

  const finalUser = user || process.env.SPRING_DATASOURCE_USERNAME || process.env.PGUSER || (rawStr.includes('avnadmin') ? 'avnadmin' : 'cybelinx');
  const finalPass = password || process.env.SPRING_DATASOURCE_PASSWORD || process.env.PGPASSWORD || '';

  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  const config: PoolConfig = {
    host,
    port,
    database,
    user: finalUser,
    password: finalPass,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  return { config, envVar: sourceEnv };
}

export function getDatabaseDiagnostics(): {
  configured: boolean;
  envVar: string;
  target?: string;
  database?: string;
  hasSsl: boolean;
  rawSample?: string;
} {
  const res = parseDatabaseConfig();
  if (!res) {
    return { configured: false, envVar: 'NONE', hasSsl: false };
  }

  const { config, envVar } = res;
  return {
    configured: true,
    envVar,
    target: `${config.user}@${config.host}:${config.port}`,
    database: config.database,
    hasSsl: Boolean(config.ssl),
    rawSample: safeMask(lastRawStr),
  };
}

export function getPool(): Pool {
  if (!pool) {
    const res = parseDatabaseConfig();
    if (!res) {
      throw new Error(
        'DATABASE_URL is not configured. Set DATABASE_URL in Vercel project environment variables.'
      );
    }

    pool = new Pool(res.config);

    pool.on('error', (err) => {
      console.error('[pg pool error]', err.message);
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
