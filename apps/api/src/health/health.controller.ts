import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', db: 'ok', timestamp };
    } catch (_error) {
      throw new ServiceUnavailableException({
        code: 'db_unreachable',
        message: 'Database unreachable',
        status: 'fail',
        db: 'fail',
        timestamp,
      });
    }
  }
}
