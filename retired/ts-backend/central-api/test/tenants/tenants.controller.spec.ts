import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiError, API_PREFIX, ErrorCode } from '@cybelinx/shared';
import { ApiErrorFilter } from '../../src/common/filters/api-error.filter';
import type { AuthPrincipal } from '../../src/modules/identity/identity-provider.adapter';
import { AuthenticationGuard } from '../../src/modules/identity/guards/authentication.guard';
import { AuthorizationGuard } from '../../src/modules/identity/guards/authorization.guard';
import { TenantsController } from '../../src/modules/tenants/tenants.controller';
import { TenantsService } from '../../src/modules/tenants/tenants.service';

const principal: AuthPrincipal = {
  user: { id: 'usr-1', email: 'a@test.com', displayName: 'A', status: 'ACTIVE', locale: null, timezone: null },
  identity: { provider: 'test-idp', subject: 'sub-1', email: 'a@test.com', name: 'A' },
};

type ServiceStub = Record<keyof TenantsService, jest.Mock>;

function createServiceStub(): ServiceStub {
  return {
    createTenant: jest.fn(),
    listTenants: jest.fn(),
    getTenant: jest.fn(),
    updateTenant: jest.fn(),
    suspendTenant: jest.fn(),
    activateTenant: jest.fn(),
    requestDeletion: jest.fn(),
    finalizeDeletion: jest.fn(),
  };
}

describe('TenantsController (e2e)', () => {
  let app: INestApplication;
  let service: ServiceStub;

  beforeAll(async () => {
    service = createServiceStub();

    const moduleRef = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        { provide: TenantsService, useValue: service },
        { provide: APP_FILTER, useClass: ApiErrorFilter },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
        },
      ],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user?: AuthPrincipal } } }) => {
          ctx.switchToHttp().getRequest().user = principal;
          return true;
        },
      })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it('POST /tenants with a valid payload calls the service with the authenticated principal', async () => {
    const payload = {
      tenantCode: 'ACME_CORP',
      name: 'ACME Corp',
      regionCode: 'NG-WEST',
      products: [{ productCode: 'JIOPLIX', planCode: 'BASIC' }],
    };
    service.createTenant.mockResolvedValueOnce({
      tenant: { tenantId: 'ten-1', tenantCode: 'ACME_CORP', name: 'ACME Corp', status: 'ACTIVE' },
      access: { userId: 'usr-1', tenantId: 'ten-1', membershipId: 'mem-1', roles: ['CYBELINX_PLATFORM_ADMIN'], permissions: [] },
      products: [],
      provisioningJobs: [],
    });

    const res = await request(app.getHttpServer()).post(`${API_PREFIX}/tenants`).send(payload).expect(201);

    expect(res.body.tenant.tenantCode).toBe('ACME_CORP');
    expect(service.createTenant).toHaveBeenCalledTimes(1);
    const [calledPrincipal, calledDto] = service.createTenant.mock.calls[0];
    expect(calledPrincipal).toEqual(principal);
    expect(calledDto.tenantCode).toBe('ACME_CORP');
    expect(calledDto.products[0].productCode).toBe('JIOPLIX');
  });

  it('POST /tenants rejects an invalid payload (400)', async () => {
    const res = await request(app.getHttpServer()).post(`${API_PREFIX}/tenants`).send({ tenantCode: 'lower' }).expect(400);

    expect(res.body.message).toBeDefined();
    expect(service.createTenant).not.toHaveBeenCalled();
  });

  it('POST /tenants does not trust tenant_id from the body (400)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API_PREFIX}/tenants`)
      .send({ tenantCode: 'ACME_CORP', name: 'ACME Corp', tenantId: 'ten-hacked', tenant_id: 'ten-hacked2' })
      .expect(400);

    expect(service.createTenant).not.toHaveBeenCalled();
    expect(res.body.message).toBeDefined();
  });

  it('POST /tenants maps ApiError codes to HTTP statuses via the filter', async () => {
    service.createTenant.mockRejectedValueOnce(new ApiError(ErrorCode.TENANT_CODE_TAKEN, 'already taken'));

    const res = await request(app.getHttpServer())
      .post(`${API_PREFIX}/tenants`)
      .send({ tenantCode: 'ACME_CORP', name: 'ACME Corp' })
      .expect(409);

    expect(res.body.code).toBe(ErrorCode.TENANT_CODE_TAKEN);
    expect(res.body.message).toContain('already taken');
  });

  it('GET /tenants applies query DTO transforms (page, limit)', async () => {
    service.listTenants.mockResolvedValueOnce({ data: [], meta: { page: 2, limit: 5, total: 0, totalPages: 0 } });

    await request(app.getHttpServer()).get(`${API_PREFIX}/tenants?page=2&limit=5`).expect(200);

    const [, query] = service.listTenants.mock.calls[0];
    expect(query.page).toBe(2);
    expect(query.limit).toBe(5);
  });

  it('GET /tenants/:tenantId requires a UUID path parameter', async () => {
    await request(app.getHttpServer()).get(`${API_PREFIX}/tenants/not-a-uuid`).expect(400);
    expect(service.getTenant).not.toHaveBeenCalled();
  });

  it('GET /tenants/:tenantId maps tenant access denial to 403', async () => {
    service.getTenant.mockRejectedValueOnce(new ApiError(ErrorCode.TENANT_ACCESS_DENIED, 'denied'));

    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/tenants/1ff19ed8-8b3e-4c8f-a2ba-4f7a1c2e6d10`).expect(403);

    expect(res.body.code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
  });

  it('POST /tenants/:tenantId/suspend delegates to the service', async () => {
    service.suspendTenant.mockResolvedValueOnce({ tenantId: '1ff19ed8-8b3e-4c8f-a2ba-4f7a1c2e6d10', status: 'SUSPENDED' });

    const res = await request(app.getHttpServer())
      .post(`${API_PREFIX}/tenants/1ff19ed8-8b3e-4c8f-a2ba-4f7a1c2e6d10/suspend`)
      .send()
      .expect(200);

    expect(res.body.status).toBe('SUSPENDED');
    const [calledPrincipal, calledTenantId] = service.suspendTenant.mock.calls[0];
    expect(calledPrincipal).toEqual(principal);
    expect(calledTenantId).toBe('1ff19ed8-8b3e-4c8f-a2ba-4f7a1c2e6d10');
  });
});