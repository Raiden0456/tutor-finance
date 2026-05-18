import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const origin = req.headers['origin'] ?? '—';
    const cookie = req.headers['cookie'] ? '✓' : '✗';

    res.on('finish', () => {
      const { statusCode } = res;
      const setCookie = res.getHeader('set-cookie');
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} | origin=${origin} req-cookie=${cookie} set-cookie=${setCookie ? JSON.stringify(setCookie) : '—'}`,
      );
    });

    next();
  }
}
