import 'reflect-metadata';
import helmet from 'helmet';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { env } from './config.js';

const httpLogger = new Logger('HTTP');

function attachLogger(server: express.Express) {
  server.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const origin = req.headers['origin'] ?? '—';
      const cookie = req.headers['cookie'] ? '✓' : '✗';
      const setCookie = res.getHeader('set-cookie');
      httpLogger.log(
        `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${ms}ms | origin=${origin} req-cookie=${cookie} set-cookie=${setCookie ? JSON.stringify(setCookie) : '—'}`,
      );
    });
    next();
  });
}

async function bootstrap() {
  // bodyParser: false is required by @thallesp/nestjs-better-auth so Better Auth
  // can read the raw request stream. The module re-installs JSON/urlencoded
  // parsers for non-auth routes via AuthModule.forRoot bodyParser options.
  const server = express();
  attachLogger(server);

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bodyParser: false },
  );

  app.use(helmet());

  app.enableCors({
    origin: [env.publicAppUrl, env.betterAuthUrl, ...env.trustedOrigins].filter(Boolean),
    credentials: true,
  });

  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(env.port, '0.0.0.0');

  console.log(`api listening on :${env.port} (${env.nodeEnv})`);
}

bootstrap().catch((err) => {
  console.error('Failed to start api', err);
  process.exit(1);
});
