#!/usr/bin/env node
/**
 * Hi there! You're here to mint a development JWT for the Admin Portal.
 *
 * The central-api signs/verifies HS256 tokens using the raw UTF-8 bytes of
 * `IDP_JWT_SECRET` as the HMAC key (see HmacSignatureVerifier and
 * IdentitySecurityConfig). A token is only accepted when:
 *   - header.alg == "HS256"
 *   - payload.sub is a non-empty string (and maps to a known identity)
 *   - payload.exp, if present, is in the future
 *   - iss/aud are only checked when IDP_ISSUER / IDP_AUDIENCE are set
 *
 * The dev bootstrap identity created by migration V6 is:
 *   identity_provider = "generic"
 *   external_subject  = "seed-dev-admin-0001"
 *   email             = dev.admin@cybelinx.test
 *
 * Usage:
 *   set IDP_JWT_SECRET=your-secret-key-32-chars-min
 *   node scripts/mint-dev-jwt.mjs                    # sub defaults to seed-dev-admin-0001
 *   node scripts/mint-dev-jwt.mjs --sub me --ttl 1   # custom subject, 1h expiry
 *   npm run mint:jwt -- --sub seed-dev-admin-0001
 *
 * The secret must be at least 32 bytes (nimbus MACVerifier requirement),
 * and must be set for the running central-api, otherwise every request
 * fails with "JWT signature verification is not configured".
 */
import { createHmac } from 'node:crypto';

const b64url = (input) => Buffer.from(input).toString('base64url');

function parseArgs(argv) {
  const args = { sub: 'seed-dev-admin-0001', email: 'dev.admin@cybelinx.test', ttlHours: 24 };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--sub':
        args.sub = argv[++i];
        break;
      case '--email':
        args.email = argv[++i];
        break;
      case '--ttl':
        args.ttlHours = Number(argv[++i]);
        break;
      case '--secret':
        args.secret = argv[++i];
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        break;
    }
  }
  return args;
}

function printUsage() {
  console.log(`
Mint a development HS256 JWT for the Cybelinx Admin Portal.

Options:
  --sub <subject>    Token subject (default: seed-dev-admin-0001)
  --email <email>    Email claim (default: dev.admin@cybelinx.test)
  --ttl <hours>      Token lifetime in hours (default: 24)
  --secret <secret>  HMAC secret override (default: $IDP_JWT_SECRET)

Environment:
  IDP_JWT_SECRET     Required. Must match the central-api env (>= 32 chars).
`);
}

const args = parseArgs(process.argv.slice(2));
const secret = args.secret || process.env.IDP_JWT_SECRET;

if (!secret) {
  console.error(
    'error: IDP_JWT_SECRET is not set. Export it first, e.g.\n  set IDP_JWT_SECRET=change-me-development-secret',
  );
  process.exit(1);
}
if (Buffer.byteLength(secret, 'utf8') < 32) {
  console.error(
    `error: IDP_JWT_SECRET must be at least 32 bytes (got ${Buffer.byteLength(secret, 'utf8')}). ` +
      'nimbus MACVerifier rejects shorter HS256 keys.',
  );
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + args.ttlHours * 3600;

const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = b64url(
  JSON.stringify({
    sub: args.sub,
    email: args.email,
    iat: now,
    exp,
  }),
);
const signingInput = `${header}.${payload}`;
const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
const token = `${signingInput}.${signature}`;

console.log('Minted dev JWT');
console.log(`  sub   : ${args.sub}`);
console.log(`  email : ${args.email}`);
console.log(`  exp   : ${new Date(exp * 1000).toISOString()} (${args.ttlHours}h)`);
console.log('');
console.log(token);
console.log('');
console.log('Paste this token into the Admin Portal → Settings → API Token.');
console.log('Requests are sent as: Authorization: Bearer <token>');
console.log(`Hint: this example decoded to sub=${args.sub} (HS256).`);