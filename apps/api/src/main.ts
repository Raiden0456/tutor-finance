import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { env } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [env.publicAppUrl, env.betterAuthUrl, ...env.trustedOrigins].filter(Boolean),
    credentials: true,
  });

  app.set('trust proxy', 1);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(env.port, '0.0.0.0');

  console.log(`api listening on :${env.port} (${env.nodeEnv})`);
}

bootstrap().catch((err) => {
  console.error('Failed to start api', err);
  process.exit(1);
});
