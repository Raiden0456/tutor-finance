import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startedAt = Date.now();
    const origin = req.headers['origin'] ?? '—';
    const hasCookie = req.headers['cookie'] ? '✓' : '✗';

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - startedAt;
      const hasSetCookie = res.getHeader('set-cookie') ? '✓' : '✗';
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${ms}ms | origin=${origin} req-cookie=${hasCookie} set-cookie=${hasSetCookie}`,
      );
    });

    next();
  }
}
