import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AppController } from './app.controller';
import { TenantController } from './tenant/tenant.controller';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma/prisma.service';
import { TenantResolverMiddleware } from './common/tenant/tenant.middleware';

@Module({
  controllers: [AppController, TenantController, HealthController],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Attach tenant (if resolvable) to every request; platform routes can ignore it.
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
