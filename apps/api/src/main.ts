import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { env } from './config.js';

async function bootstrap() {
  // bodyParser: false is required by @thallesp/nestjs-better-auth so Better Auth
  // can read the raw request stream. The module re-installs JSON/urlencoded
  // parsers for non-auth routes via AuthModule.forRoot bodyParser options.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

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
