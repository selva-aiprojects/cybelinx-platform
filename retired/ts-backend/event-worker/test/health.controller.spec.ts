import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { API_PREFIX, APP_NAME } from '@cybelinx/shared';
import { HealthModule } from '../src/modules/health/health.module';

describe('HealthController (event-worker)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok with service metadata', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe(APP_NAME);
    expect(res.body.module).toBe('event-worker');
  });

  it('GET /health/live reports liveness up', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/health/live`).expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.info.liveness.status).toBe('up');
  });

  it('GET /health/ready reports worker up after bootstrap', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/health/ready`).expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.info.worker.status).toBe('up');
  });
});