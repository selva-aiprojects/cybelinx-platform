import { getDefaultEnv, isEnv, parseEnv, safeParseEnv } from '../src';

describe('@cybelinx/config', () => {
  it('applies defaults when no environment is provided', () => {
    const env = parseEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3001);
    expect(env.WORKER_PORT).toBe(3002);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.DATABASE_URL).toContain('localhost:5432/cybelinx_platform');
  });

  it('coerces string values into numbers', () => {
    const env = parseEnv({ API_PORT: '4000' });
    expect(env.API_PORT).toBe(4000);
    expect(typeof env.API_PORT).toBe('number');
  });

  it('rejects an invalid environment', () => {
    expect(() => parseEnv({ DATABASE_URL: '' })).toThrow();
    expect(safeParseEnv({ WORKER_BATCH_SIZE: '-5' }).success).toBe(false);
  });

  it('can be used as a type guard', () => {
    expect(isEnv({})).toBe(true);
    expect(isEnv(null)).toBe(false);
    expect(getDefaultEnv().CORS_ORIGINS).toBe('http://localhost:3000');
  });
});