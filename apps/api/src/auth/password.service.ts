import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private static readonly weakPasswords = new Set(
    ['12345678', 'password', 'admin123', 'qwerty123', '11111111', '123456789'].map((p) =>
      p.toLowerCase()
    )
  );

  async hash(password: string): Promise<string> {
    // Argon2id is recommended for password hashing
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Validates password strength according to minimal policy:
   * - At least 8 characters
   * - At least 1 letter and 1 number
   * - Not in a short list of common weak passwords
   *
   * Throws BadRequestException with code "weak_password" when invalid.
   */
  validateStrength(password: string): void {
    const value = password.trim();

    if (value.length < 8) {
      throw new BadRequestException({
        code: 'weak_password',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
      throw new BadRequestException({
        code: 'weak_password',
        message: 'Password must contain at least one letter and one number',
      });
    }

    if (PasswordService.weakPasswords.has(value.toLowerCase())) {
      throw new BadRequestException({
        code: 'weak_password',
        message: 'Password is too common',
      });
    }
  }
}
