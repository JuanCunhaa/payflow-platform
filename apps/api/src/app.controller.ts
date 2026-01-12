import { Controller, Get } from '@nestjs/common';
import { i18nKeys } from '@payflow/shared';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { status: 'ok', message: i18nKeys.common.ok };
  }
}
