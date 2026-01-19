import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { ConsoleEmailProvider } from '../notifications/console-email.provider';
import { EMAIL_PROVIDER_TOKEN } from '../notifications/email-provider';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'payflow-dev-secret-change-in-production',
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    PasswordService,
    AuditService,
    ConsoleEmailProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: (consoleProvider: ConsoleEmailProvider) => {
        const providerName = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
        switch (providerName) {
          case 'console':
          default:
            return consoleProvider;
        }
      },
      inject: [ConsoleEmailProvider],
    },
    EmailService,
  ],
  exports: [AuthService, JwtModule, PasswordService, AuditService, EmailService],
})
export class AuthModule {}
