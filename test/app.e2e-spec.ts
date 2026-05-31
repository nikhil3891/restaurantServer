import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * E2E tests boot the full NestJS application.
 * They require a running PostgreSQL + Redis (use Docker: `docker-compose up -d`).
 *
 * Run with: pnpm test:e2e
 */
describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/v1/health → 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Auth endpoints exist', () => {
    it('POST /api/v1/auth/register → not 404', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({}) // empty body → 400 validation error, not 404
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('POST /api/v1/auth/login → not 404', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });
});
