import { AuditService } from './audit.service';

async function run() {
  const created: any[] = [];

  const prismaMock = {
    auditLog: {
      create: async (args: any) => {
        created.push(args.data);
        return args.data;
      },
    },
  };

  const service = new AuditService(prismaMock as any);

  await service.log({
    actorType: 'USER',
    action: 'auth.login.success',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    metadata: {
      email: 'user@example.com',
      password: 'Secret123',
      tokens: {
        accessToken: 'jwt-secret',
      },
    },
    ip: '127.0.0.1',
    userAgent: 'jest-test',
  });

  if (created.length !== 1) {
    throw new Error('AuditService should create one audit log entry');
  }

  const entry = created[0];

  if (entry.tenantId !== 'tenant-1' || entry.actorUserId !== 'user-1') {
    throw new Error('AuditService did not persist tenantId/actorUserId correctly');
  }

  if (!entry.metadata) {
    throw new Error('AuditService should store metadata');
  }

  const meta = entry.metadata as any;
  if (meta.email !== 'user@example.com') {
    throw new Error('AuditService should keep non-sensitive fields intact');
  }

  if (meta.password !== '[redacted]') {
    throw new Error('AuditService should redact password fields');
  }

  if (meta.tokens !== '[redacted]') {
    throw new Error('AuditService should redact token fields');
  }

  console.log('AuditService tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
