import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root()', () => {
    it('should return API name and version', () => {
      const result = appController.root();
      expect(result.name).toBe('Restaurant ERP API');
      expect(result.version).toBe('1.0');
    });
  });

  describe('health()', () => {
    it('should return status ok with uptime and timestamp', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
