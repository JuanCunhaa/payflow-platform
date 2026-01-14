import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service';

async function run() {
  const service = new PasswordService();

  // hash() should produce a non-empty string
  const plain = 'StrongPass1';
  const hash = await service.hash(plain);
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new Error('hash() did not return a non-empty string');
  }

  // verify() should return true for correct password and false otherwise
  const ok = await service.verify(plain, hash);
  const fail = await service.verify('WrongPass1', hash);
  if (!ok) {
    throw new Error('verify() should return true for correct password');
  }
  if (fail) {
    throw new Error('verify() should return false for incorrect password');
  }

  // validateStrength() should reject weak passwords
  const weakPasswords = ['12345678', 'password', 'admin123', 'short1', 'NoNumber1'.replace('1', '')];

  for (const pwd of weakPasswords) {
    let threw = false;
    try {
      service.validateStrength(pwd);
    } catch (e) {
      threw = e instanceof BadRequestException;
      if (threw) {
        const resp: any = (e as BadRequestException).getResponse();
        if (resp.code !== 'weak_password') {
          throw new Error(`Expected weak_password code, got ${resp.code}`);
        }
      }
    }
    if (!threw) {
      throw new Error(`Expected validateStrength() to throw for weak password: ${pwd}`);
    }
  }

  // validateStrength() should accept a strong password
  service.validateStrength('Admin@12345');

  console.log('PasswordService tests passed');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

