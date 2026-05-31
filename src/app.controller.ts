import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Restaurant ERP API',
      version: '1.0',
      status: 'running',
      docs: '/api/docs',
    };
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
