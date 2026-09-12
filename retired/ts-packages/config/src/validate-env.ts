import { safeParseEnv } from './index';

export function validateEnv(env: Record<string, unknown>): {
  ok: boolean;
  issues: string[];
} {
  const result = safeParseEnv(env);

  if (result.success) {
    return { ok: true, issues: [] };
  }

  const issues = result.error.issues.map(
    (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );

  return { ok: false, issues };
}

export function main(): void {
  const { ok, issues } = validateEnv(process.env);

  if (ok) {
    console.log('[validate:env] OK — environment schema is satisfied');
    return;
  }

  console.error('[validate:env] FAILED — environment schema violations:');
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}