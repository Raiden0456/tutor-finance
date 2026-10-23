import { HttpException, HttpStatus } from '@nestjs/common';
import type { AiErrorCode } from '@tutor-finance/shared';

export class AiError extends HttpException {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super({ statusCode: status, code, message }, status);
  }
}
